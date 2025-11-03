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
const updateFeedingSchema = z.object({
  amount: z.union([z.number().positive(), z.null()]).optional(),
  notes: z.string().max(255).optional(),
  meal_type: z.enum(['manual', 'scheduled', 'automatic']).optional(),
  unit: z.enum(['g', 'ml', 'cups', 'oz']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido para atualização',
});

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
    
    // Validate the request body against schema
    const validationResult = updateFeedingSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('[PUT /api/v2/feedings/[id]] Invalid body', { 
        errors: validationResult.error.format() 
      });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, { status: 400 });
    }

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
    const updateData: any = {};
    const validatedData = validationResult.data;

    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.amount != null 
        ? new Prisma.Decimal(validatedData.amount) 
        : new Prisma.Decimal(0);
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes || null;
    }

    if (validatedData.meal_type !== undefined) {
      updateData.meal_type = validatedData.meal_type;
    }

    if (validatedData.unit !== undefined) {
      updateData.unit = validatedData.unit;
    }

    // Update the feeding log
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

    // Transform the data to match the expected format
    const transformedLog = {
      id: updatedLog.id,
      catId: updatedLog.cat_id,
      userId: updatedLog.fed_by,
      timestamp: updatedLog.fed_at,
      portionSize: updatedLog.amount,
      notes: updatedLog.notes,
      mealType: updatedLog.meal_type,
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

