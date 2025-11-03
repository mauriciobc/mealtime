import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { z } from 'zod';

/**
 * Valida e normaliza o peso do gato
 */
function validateWeight(weight: any): { isValid: boolean; value: number | null; error?: string } {
  if (weight === null || weight === undefined || weight === '') {
    return { isValid: true, value: null };
  }

  const weightNum = Number(parseFloat(weight));
  
  if (Number.isNaN(weightNum)) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Peso deve ser um número válido' 
    };
  }

  if (weightNum < 0) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Peso não pode ser negativo' 
    };
  }

  // Validação adicional: peso máximo razoável para um gato (50kg)
  if (weightNum > 50) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Peso deve ser menor que 50kg' 
    };
  }

  return { isValid: true, value: weightNum };
}

/**
 * Valida e normaliza a data de nascimento do gato
 */
function validateBirthDate(birth_date: any): { isValid: boolean; value: Date | null; error?: string } {
  if (birth_date === null || birth_date === undefined || birth_date === '') {
    return { isValid: true, value: null };
  }

  const date = new Date(birth_date);
  
  if (isNaN(date.getTime())) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Data de nascimento deve ser uma data válida' 
    };
  }

  // Validação adicional: data não pode ser no futuro
  const now = new Date();
  if (date > now) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Data de nascimento não pode ser no futuro' 
    };
  }

  // Validação adicional: data não pode ser muito antiga (mais de 30 anos)
  const thirtyYearsAgo = new Date();
  thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
  if (date < thirtyYearsAgo) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Data de nascimento não pode ser há mais de 30 anos' 
    };
  }

  return { isValid: true, value: date };
}

// Schema de validação para atualização de gato
const updateCatSchema = z.object({
  name: z.string().min(1).optional(),
  photoUrl: z.string().url().nullable().optional(),
  birthDate: z.string().optional(),
  weight: z.union([z.number(), z.null()]).optional(),
  feeding_interval: z.number().int().min(1).max(24).optional(),
  portion_size: z.number().positive().optional(),
  restrictions: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido para atualização',
});

// GET /api/v2/cats/[catId] - Buscar gato por ID
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ catId: string }> }
) => {
  try {
    const resolvedParams = await context?.params || { catId: '' };
    const { catId } = resolvedParams;

    if (!catId) {
      logger.warn('[GET /api/v2/cats/[catId]] Missing catId parameter');
      return NextResponse.json({
        success: false,
        error: 'ID do gato é obrigatório'
      }, { status: 400 });
    }

    logger.debug('[GET /api/v2/cats/[catId]] Authenticated user:', { 
      userId: user.id, 
      catId 
    });

    // Get the cat and verify the user has access through their household
    const cat = await prisma.cats.findFirst({
      where: {
        id: catId,
        household: {
          household_members: {
            some: {
              user_id: user.id
            }
          }
        }
      },
      include: {
        household: {
          select: {
            id: true,
            name: true,
            created_at: true
          }
        },
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true
          }
        },
        schedules: {
          select: {
            id: true,
            type: true,
            interval: true,
            times: true,
            enabled: true
          }
        }
      }
    });

    if (!cat) {
      logger.warn(`[GET /api/v2/cats/[catId]] Cat not found or access denied:`, {
        catId,
        userId: user.id
      });
      return NextResponse.json({
        success: false,
        error: 'Gato não encontrado ou acesso negado'
      }, { status: 404 });
    }

    logger.info(`[GET /api/v2/cats/[catId]] Cat retrieved successfully:`, { catId });
    return NextResponse.json({
      success: true,
      data: cat
    });
  } catch (error: any) {
    logger.logError(error, {
      message: 'Erro ao buscar gato',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao buscar o gato'
    }, { status: 500 });
  }
});

// PUT /api/v2/cats/[catId] - Atualizar gato
export const PUT = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ catId: string }> }
) => {
  try {
    const resolvedParams = await context?.params || { catId: '' };
    const { catId } = resolvedParams;

    if (!catId) {
      logger.warn('[PUT /api/v2/cats/[catId]] Missing catId parameter');
      return NextResponse.json({
        success: false,
        error: 'ID do gato é obrigatório'
      }, { status: 400 });
    }

    logger.debug('[PUT /api/v2/cats/[catId]] Authenticated user:', { 
      userId: user.id, 
      catId 
    });

    const body = await request.json();
    
    // Validate request body
    const validationResult = updateCatSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('[PUT /api/v2/cats/[catId]] Invalid request body:', {
        errors: validationResult.error.format()
      });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    // Validar peso se fornecido
    if (body.weight !== undefined) {
      const weightValidation = validateWeight(body.weight);
      if (!weightValidation.isValid) {
        logger.warn('[PUT /api/v2/cats/[catId]] Invalid weight:', body.weight);
        return NextResponse.json({
          success: false,
          error: weightValidation.error
        }, { status: 400 });
      }
    }

    // Validar data de nascimento se fornecida
    if (body.birthDate !== undefined) {
      const birthDateValidation = validateBirthDate(body.birthDate);
      if (!birthDateValidation.isValid) {
        logger.warn('[PUT /api/v2/cats/[catId]] Invalid birthDate:', body.birthDate);
        return NextResponse.json({
          success: false,
          error: birthDateValidation.error
        }, { status: 400 });
      }
    }

    // Get the cat and verify the user has access through their household
    const cat = await prisma.cats.findFirst({
      where: {
        id: catId,
        household: {
          household_members: {
            some: {
              user_id: user.id
            }
          }
        }
      },
      select: {
        id: true,
        household_id: true
      }
    });

    if (!cat) {
      logger.warn(`[PUT /api/v2/cats/[catId]] Cat not found or access denied:`, {
        catId,
        userId: user.id
      });
      return NextResponse.json({
        success: false,
        error: 'Gato não encontrado ou acesso negado'
      }, { status: 404 });
    }

    // Preparar dados para atualização com validações aplicadas
    const updateData: any = {};
    
    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    
    if (body.birthDate !== undefined) {
      const birthDateValidation = validateBirthDate(body.birthDate);
      updateData.birth_date = birthDateValidation.value;
    }
    
    if (body.weight !== undefined) {
      const weightValidation = validateWeight(body.weight);
      updateData.weight = weightValidation.value;
    }
    
    if (body.photoUrl !== undefined) {
      updateData.photo_url = body.photoUrl;
    }

    if (body.feeding_interval !== undefined) {
      updateData.feeding_interval = body.feeding_interval;
    }

    if (body.portion_size !== undefined) {
      updateData.portion_size = body.portion_size;
    }

    if (body.restrictions !== undefined) {
      updateData.restrictions = body.restrictions.trim() || null;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes.trim() || null;
    }

    // Update the cat
    const updatedCat = await prisma.cats.update({
      where: {
        id: catId
      },
      data: updateData,
      include: {
        household: {
          select: {
            id: true,
            name: true,
            created_at: true
          }
        },
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true
          }
        },
        schedules: {
          select: {
            id: true,
            type: true,
            interval: true,
            times: true,
            enabled: true
          }
        }
      }
    });

    logger.info(`[PUT /api/v2/cats/[catId]] Cat updated successfully:`, { catId });
    return NextResponse.json({
      success: true,
      data: updatedCat
    });
  } catch (error: any) {
    // Handle Prisma errors
    if (error.code === 'P2025') {
      logger.warn('[PUT /api/v2/cats/[catId]] Cat not found during update');
      return NextResponse.json({
        success: false,
        error: 'Gato não encontrado'
      }, { status: 404 });
    }

    logger.logError(error, {
      message: 'Erro ao atualizar gato',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao atualizar o gato'
    }, { status: 500 });
  }
});

// DELETE /api/v2/cats/[catId] - Deletar gato
export const DELETE = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ catId: string }> }
) => {
  try {
    const resolvedParams = await context?.params || { catId: '' };
    const { catId } = resolvedParams;

    if (!catId) {
      logger.warn('[DELETE /api/v2/cats/[catId]] Missing catId parameter');
      return NextResponse.json({
        success: false,
        error: 'ID do gato é obrigatório'
      }, { status: 400 });
    }

    logger.debug(`[DELETE /api/v2/cats/[catId]] Attempting delete by user:`, {
      userId: user.id,
      catId
    });

    // 1. Find the cat and its household ID
    const cat = await prisma.cats.findUnique({
      where: { id: catId },
      select: { household_id: true, name: true }
    });

    if (!cat) {
      logger.warn(`[DELETE /api/v2/cats/[catId]] Cat not found:`, { catId });
      return NextResponse.json({
        success: false,
        error: 'Gato não encontrado'
      }, { status: 404 });
    }
    
    const householdId = cat.household_id;
    if (!householdId) {
      logger.error(`[DELETE /api/v2/cats/[catId]] Cat has no associated household:`, { catId });
      return NextResponse.json({
        success: false,
        error: 'Gato não está associado a um domicílio'
      }, { status: 500 });
    }

    // 2. Verify user membership in that household
    logger.debug(`[DELETE /api/v2/cats/[catId]] Verifying user membership:`, {
      userId: user.id,
      householdId
    });
    const userAccess = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: householdId
      },
      select: { user_id: true }
    });

    if (!userAccess) {
      logger.warn(`[DELETE /api/v2/cats/[catId]] Access denied:`, {
        userId: user.id,
        householdId
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado: Usuário não pertence a este domicílio'
      }, { status: 403 });
    }
    
    logger.debug(`[DELETE /api/v2/cats/[catId]] User authorized, starting deletion transaction`);

    // 3. Perform Deletion (within a transaction for atomicity)
    await prisma.$transaction(async (tx) => {
      // Delete associated feeding logs
      const deletedLogs = await tx.feeding_logs.deleteMany({
        where: { cat_id: catId }
      });
      logger.debug(`[DELETE /api/v2/cats/[catId]] Associated feeding logs deleted:`, {
        count: deletedLogs.count
      });

      // Delete associated weight logs
      const deletedWeightLogs = await tx.cat_weight_logs.deleteMany({
        where: { cat_id: catId }
      });
      logger.debug(`[DELETE /api/v2/cats/[catId]] Associated weight logs deleted:`, {
        count: deletedWeightLogs.count
      });

      // Delete associated schedules
      const deletedSchedules = await tx.schedules.deleteMany({
        where: { cat_id: catId }
      });
      logger.debug(`[DELETE /api/v2/cats/[catId]] Associated schedules deleted:`, {
        count: deletedSchedules.count
      });

      // Delete the cat
      await tx.cats.delete({
        where: { id: catId }
      });
      logger.debug(`[DELETE /api/v2/cats/[catId]] Cat deleted successfully`);
    });

    logger.info(`[DELETE /api/v2/cats/[catId]] Deletion transaction completed successfully:`, { catId });
    return NextResponse.json({
      success: true,
      message: 'Gato deletado com sucesso'
    });
  } catch (error: any) {
    // Handle Prisma errors
    if (error.code === 'P2025') {
      logger.warn('[DELETE /api/v2/cats/[catId]] Cat not found during delete');
      return NextResponse.json({
        success: false,
        error: 'Gato não encontrado'
      }, { status: 404 });
    }

    logger.logError(error, {
      message: 'Erro ao deletar gato',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao deletar o gato',
      details: (error instanceof Error) ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

