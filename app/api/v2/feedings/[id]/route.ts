import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

/**
 * Extrai e valida o ID do parâmetro de rota de forma robusta
 * @param context - Contexto com params do Next.js (fonte confiável)
 * @param request - Request para fallback sanitizado
 * @returns ID validado ou null se inválido
 */
function extractAndValidateId(
  context: { params: Promise<{ id: string }> } | undefined,
  request: NextRequest
): string | null {
  // Priorizar context.params (método confiável do Next.js)
  if (context?.params) {
    return null; // Será resolvido no handler
  }

  // Fallback sanitizado: extrair último segmento não-vazio
  const pathname = request.nextUrl.pathname.replace(/\/+$/, ''); // Remove trailing slashes
  const segments = pathname.split('/').filter(s => s.length > 0);
  const lastSegment = segments[segments.length - 1];

  // Validar formato UUID (padrão esperado para IDs no banco)
  // UUID v4: 8-4-4-4-12 caracteres hexadecimais
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!lastSegment || !uuidPattern.test(lastSegment)) {
    return null; // ID inválido
  }

  return lastSegment;
}

// GET /api/v2/feedings/[id] - Buscar detalhes de um registro de alimentação
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  // Extrair e validar ID de forma robusta
  let logId: string | null = null;
  
  if (context?.params) {
    const params = await context.params;
    logId = params.id;
    
    // Validar formato UUID mesmo quando vem do context
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(logId)) {
      logId = null;
    }
  } else {
    logId = extractAndValidateId(context, request);
  }

  if (!logId) {
    logger.warn('[GET /api/v2/feedings/[id]] Invalid or missing ID');
    return NextResponse.json({
      success: false,
      error: 'ID do registro inválido ou ausente'
    }, { status: 400 });
  }

  logger.debug(`[GET /api/v2/feedings/${logId}] Request from user ${user.id}`);

  try {
    // Fetch log including household ID for verification
    const feedingLog = await prisma.feeding_logs.findUnique({
      where: { id: logId },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            household_id: true
          }
        },
        feeder: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true
          }
        }
      }
    });

    if (!feedingLog) {
      logger.warn(`[GET /api/v2/feedings/${logId}] Feeding log not found`);
      return NextResponse.json({
        success: false,
        error: 'Registro de alimentação não encontrado'
      }, { status: 404 });
    }

    // Verify user belongs to the household associated with the log
    const logHouseholdId = feedingLog.household_id;
    if (!logHouseholdId) {
      logger.error(`[GET /api/v2/feedings/${logId}] Log ${logId} has no household ID`);
      return NextResponse.json({
        success: false,
        error: 'Log is not associated with a household'
      }, { status: 500 });
    }

    logger.debug(`[GET /api/v2/feedings/${logId}] Verifying user ${user.id} membership in household ${logHouseholdId}`);
    const userAccess = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: logHouseholdId
      },
      select: { user_id: true }
    });

    if (!userAccess) {
      logger.warn(`[GET /api/v2/feedings/${logId}] User ${user.id} not member of household ${logHouseholdId}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied: User cannot view this log'
      }, { status: 403 });
    }
    
    logger.info(`[GET /api/v2/feedings/${logId}] User ${user.id} authorized`);

    // Transform the data to match the expected format
    const transformedLog = {
      id: feedingLog.id,
      catId: feedingLog.cat_id,
      userId: feedingLog.fed_by,
      timestamp: feedingLog.fed_at,
      portionSize: feedingLog.amount,
      notes: feedingLog.notes,
      mealType: feedingLog.meal_type,
      food_type: feedingLog.food_type,
      householdId: feedingLog.household_id,
      cat: feedingLog.cat ? {
        id: feedingLog.cat.id,
        name: feedingLog.cat.name,
        photoUrl: feedingLog.cat.photo_url
      } : undefined,
      user: feedingLog.feeder ? {
        id: feedingLog.feeder.id,
        name: feedingLog.feeder.full_name,
        avatar: feedingLog.feeder.avatar_url
      } : undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedLog
    });
  } catch (error) {
    logger.error(`[GET /api/v2/feedings/${logId}] Error fetching feeding log`, { error });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao buscar o registro de alimentação',
      ...(process.env.NODE_ENV === 'development' && {
        details: (error instanceof Error) ? error.message : 'Unknown error'
      })
    }, { status: 500 });
  }
});

// Schema de validação para atualização de alimentação
// amount: aceita apenas número positivo ou pode ser omitido (undefined)
// null não é permitido pois o campo é obrigatório no banco de dados
const updateFeedingSchema = z.object({
  amount: z.number().positive({
    message: 'O campo amount deve ser um número positivo'
  }).optional(),
  notes: z.string().max(255).optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  unit: z.enum(['g', 'ml', 'cups', 'oz']).optional(),
  food_type: z.string().max(255).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido para atualização',
});

// Tipo para os dados de atualização do Prisma
// amount não pode ser null pois o campo é obrigatório no schema do banco
type UpdateFeedingData = {
  amount?: Prisma.Decimal;
  notes?: string | null;
  meal_type?: string;
  unit?: string;
  food_type?: string | null;
};

// PUT /api/v2/feedings/[id] - Atualizar um registro de alimentação
export const PUT = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  // Extrair e validar ID de forma robusta
  let logId: string | null = null;
  
  if (context?.params) {
    const params = await context.params;
    logId = params.id;
    
    // Validar formato UUID mesmo quando vem do context
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(logId)) {
      logId = null;
    }
  } else {
    logId = extractAndValidateId(context, request);
  }

  if (!logId) {
    logger.warn('[PUT /api/v2/feedings/[id]] Invalid or missing ID');
    return NextResponse.json({
      success: false,
      error: 'ID do registro inválido ou ausente'
    }, { status: 400 });
  }

  logger.debug(`[PUT /api/v2/feedings/${logId}] Attempting update by user ${user.id}`);

  try {
    const body = await request.json();
    
    // #region agent log
    const fs = await import('fs/promises');
    const logPath = '/home/mauriciobc/Documentos/Code/mealtime/.cursor/debug.log';
    const logEntry = JSON.stringify({location:'route.ts:229',message:'PUT request body received',data:{body,logId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'}) + '\n';
    await fs.appendFile(logPath, logEntry).catch(() => {});
    // #endregion
    
    // Validate the request body against schema
    const validationResult = updateFeedingSchema.safeParse(body);
    if (!validationResult.success) {
      // #region agent log
      const errorLog = JSON.stringify({location:'route.ts:239',message:'Validation failed',data:{errors:validationResult.error.format(),body,logId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'}) + '\n';
      await fs.appendFile(logPath, errorLog).catch(() => {});
      // #endregion
      logger.error('[PUT /api/v2/feedings/[id]] Invalid body', { 
        errors: validationResult.error.format() 
      });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, { status: 400 });
    }
    
    // #region agent log
    const successLog = JSON.stringify({location:'route.ts:253',message:'Validation passed',data:{validatedData:validationResult.data,logId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'}) + '\n';
    await fs.appendFile(logPath, successLog).catch(() => {});
    // #endregion

    // Fetch log including household ID for verification
    const feedingLog = await prisma.feeding_logs.findUnique({
      where: { id: logId },
      select: { 
        id: true,
        household_id: true,
        cat_id: true
      }
    });

    if (!feedingLog) {
      logger.warn(`[PUT /api/v2/feedings/${logId}] Feeding log not found`);
      return NextResponse.json({
        success: false,
        error: 'Registro de alimentação não encontrado'
      }, { status: 404 });
    }

    // Verify user belongs to the household associated with the log
    const logHouseholdId = feedingLog.household_id;
    if (!logHouseholdId) {
      logger.error(`[PUT /api/v2/feedings/${logId}] Log ${logId} has no household ID`);
      return NextResponse.json({
        success: false,
        error: 'Log is not associated with a household'
      }, { status: 500 });
    }

    logger.debug(`[PUT /api/v2/feedings/${logId}] Verifying user ${user.id} membership in household ${logHouseholdId}`);
    const userAccess = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: logHouseholdId
      },
      select: { user_id: true }
    });

    if (!userAccess) {
      logger.warn(`[PUT /api/v2/feedings/${logId}] User ${user.id} not member of household ${logHouseholdId}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied: User cannot update this log'
      }, { status: 403 });
    }
    
    logger.info(`[PUT /api/v2/feedings/${logId}] User ${user.id} authorized`);

    // Build update data object with only provided fields
    const updateData: UpdateFeedingData = {};
    const validatedData = validationResult.data;

    // amount: apenas números positivos são aceitos (null não é permitido)
    if (validatedData.amount !== undefined) {
      updateData.amount = new Prisma.Decimal(validatedData.amount);
    }

    if (validatedData.notes !== undefined) {
      // Preservar string vazia ou null explicitamente, não usar ||
      updateData.notes = validatedData.notes;
    }

    if (validatedData.meal_type !== undefined) {
      updateData.meal_type = validatedData.meal_type;
    }

    if (validatedData.unit !== undefined) {
      updateData.unit = validatedData.unit;
    }

    if (validatedData.food_type !== undefined) {
      // Preservar string vazia ou null explicitamente
      updateData.food_type = validatedData.food_type;
    }

    // Update the feeding log
    // amount não pode ser null pois é obrigatório no schema do banco
    const updatedLog = await prisma.feeding_logs.update({
      where: { id: logId },
      data: updateData,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            household_id: true
          }
        },
        feeder: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true
          }
        }
      }
    });

    logger.info(`[PUT /api/v2/feedings/${logId}] Feeding log updated successfully`);

    // #region agent log
    const updateSuccessLog = JSON.stringify({location:'route.ts:343',message:'Update successful',data:{logId,updatedLogId:updatedLog.id},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'}) + '\n';
    await fs.appendFile(logPath, updateSuccessLog).catch(() => {});
    // #endregion

    // Transform the data to match the expected format
    const transformedLog = {
      id: updatedLog.id,
      catId: updatedLog.cat_id,
      userId: updatedLog.fed_by,
      timestamp: updatedLog.fed_at,
      portionSize: updatedLog.amount,
      notes: updatedLog.notes,
      mealType: updatedLog.meal_type,
      food_type: updatedLog.food_type,
      unit: updatedLog.unit,
      householdId: updatedLog.household_id,
      cat: updatedLog.cat ? {
        id: updatedLog.cat.id,
        name: updatedLog.cat.name,
        photoUrl: updatedLog.cat.photo_url
      } : undefined,
      user: updatedLog.feeder ? {
        id: updatedLog.feeder.id,
        name: updatedLog.feeder.full_name,
        avatar: updatedLog.feeder.avatar_url
      } : undefined
    };

    return NextResponse.json({
      success: true,
      data: transformedLog
    });
  } catch (error: any) {
    // #region agent log
    const fs = await import('fs/promises');
    const logPath = '/home/mauriciobc/Documentos/Code/mealtime/.cursor/debug.log';
    const errorCatchLog = JSON.stringify({location:'route.ts:393',message:'Error caught in catch block',data:{errorMessage:error?.message,errorCode:error?.code,errorName:error?.name,logId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'}) + '\n';
    await fs.appendFile(logPath, errorCatchLog).catch(() => {});
    // #endregion
    
    // Handle Prisma errors
    if (error.code === 'P2025') {
      logger.warn('[PUT /api/v2/feedings/[id]] Feeding log not found during update');
      return NextResponse.json({
        success: false,
        error: 'Registro de alimentação não encontrado'
      }, { status: 404 });
    }

    logger.logError(error, {
      message: 'Erro ao atualizar registro de alimentação',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao atualizar o registro de alimentação',
      ...(process.env.NODE_ENV === 'development' && {
        details: (error instanceof Error) ? error.message : 'Unknown error'
      })
    }, { status: 500 });
  }
});

// DELETE /api/v2/feedings/[id] - Excluir um registro de alimentação
export const DELETE = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  // Extrair e validar ID de forma robusta (mesma lógica do GET)
  let logId: string | null = null;
  
  if (context?.params) {
    const params = await context.params;
    logId = params.id;
    
    // Validar formato UUID mesmo quando vem do context
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(logId)) {
      logId = null;
    }
  } else {
    logId = extractAndValidateId(context, request);
  }

  if (!logId) {
    logger.warn('[DELETE /api/v2/feedings/[id]] Invalid or missing ID');
    return NextResponse.json({
      success: false,
      error: 'ID do registro inválido ou ausente'
    }, { status: 400 });
  }

  logger.debug(`[DELETE /api/v2/feedings/${logId}] Attempting delete by user ${user.id}`);

  try {
    logger.debug(`[DELETE /api/v2/feedings/${logId}] Fetching feeding log...`);
    const feedingLog = await prisma.feeding_logs.findUnique({
      where: { id: logId },
      select: { household_id: true }
    });

    if (!feedingLog) {
      logger.warn(`[DELETE /api/v2/feedings/${logId}] Feeding log not found`);
      return NextResponse.json({
        success: false,
        error: 'Feeding log not found'
      }, { status: 404 });
    }

    const householdId = feedingLog.household_id;
    if (!householdId) {
      logger.error(`[DELETE /api/v2/feedings/${logId}] Log ${logId} has no household ID`);
      return NextResponse.json({
        success: false,
        error: 'Log is not associated with a household'
      }, { status: 500 });
    }

    logger.debug(`[DELETE /api/v2/feedings/${logId}] Verifying user ${user.id} membership in household ${householdId}`);
    const userAccess = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: householdId
      },
      select: { user_id: true }
    });

    if (!userAccess) {
      logger.warn(`[DELETE /api/v2/feedings/${logId}] User ${user.id} not member of household ${householdId}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied: User does not belong to this household'
      }, { status: 403 });
    }
    
    logger.info(`[DELETE /api/v2/feedings/${logId}] User ${user.id} authorized`);

    logger.debug(`[DELETE /api/v2/feedings/${logId}] Deleting log...`);
    await prisma.feeding_logs.delete({
      where: { id: logId }
    });
    logger.info(`[DELETE /api/v2/feedings/${logId}] Log deleted successfully`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`[DELETE /api/v2/feedings/${logId}] Error deleting feeding log`, { error });
    if (error instanceof Error && (error as any).code === 'P2025') {
      return NextResponse.json({
        success: false,
        error: 'Log not found during delete attempt'
      }, { status: 404 });
    }
    return NextResponse.json({
      success: false,
      error: 'An error occurred while deleting the feeding log',
      ...(process.env.NODE_ENV === 'development' && {
        details: (error instanceof Error) ? error.message : 'Unknown error'
      })
    }, { status: 500 });
  }
});

