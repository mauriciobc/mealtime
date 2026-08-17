import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { parseGender } from '@/lib/types/common';
import { requireCatAccess } from '@/lib/authz/household-access';
import { feedingIntervalOf, updateCatSchema } from '@/lib/validations/cats';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

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
      return v2Err('ID do gato é obrigatório', 400);
    }

    logger.debug('[GET /api/v2/cats/[catId]] Authenticated user:', { 
      userId: user.id, 
      catId 
    });

    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;

    const cat = await prisma.cats.findUnique({
      where: { id: catId },
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
      return v2Err('Gato não encontrado ou acesso negado', 404);
    }

    logger.info(`[GET /api/v2/cats/[catId]] Cat retrieved successfully:`, { catId });
    return v2Ok(cat);
  } catch (error: any) {
    logger.logError(error, {
      message: 'Erro ao buscar gato',
      requestUrl: request.nextUrl.toString()
    });
    return v2Err('Ocorreu um erro ao buscar o gato', 500);
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
      return v2Err('ID do gato é obrigatório', 400);
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
      return v2Err('Dados inválidos', 400, validationResult.error.format());
    }

    const data = validationResult.data;

    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.birthdate !== undefined) {
      updateData.birth_date = data.birthdate ? new Date(data.birthdate) : null;
    }
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.photoUrl !== undefined) updateData.photo_url = data.photoUrl || null;
    if (data.feedingInterval !== undefined || data.feeding_interval !== undefined) {
      updateData.feeding_interval = feedingIntervalOf(data);
    }
    if (data.portion_size !== undefined) updateData.portion_size = data.portion_size;
    if (data.restrictions !== undefined) updateData.restrictions = data.restrictions?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.gender !== undefined) updateData.gender = parseGender(data.gender);

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
    return v2Ok(updatedCat);
  } catch (error: any) {
    // Handle Prisma errors
    if (error.code === 'P2025') {
      logger.warn('[PUT /api/v2/cats/[catId]] Cat not found during update');
      return v2Err('Gato não encontrado', 404);
    }

    logger.logError(error, {
      message: 'Erro ao atualizar gato',
      requestUrl: request.nextUrl.toString()
    });
    return v2Err('Ocorreu um erro ao atualizar o gato', 500);
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
      return v2Err('ID do gato é obrigatório', 400);
    }

    logger.debug(`[DELETE /api/v2/cats/[catId]] Attempting delete by user:`, {
      userId: user.id,
      catId
    });

    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;
    
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
    return v2Ok({ message: 'Gato deletado com sucesso' });
  } catch (error: any) {
    // Handle Prisma errors
    if (error.code === 'P2025') {
      logger.warn('[DELETE /api/v2/cats/[catId]] Cat not found during delete');
      return v2Err('Gato não encontrado', 404);
    }

    logger.logError(error, {
      message: 'Erro ao deletar gato',
      requestUrl: request.nextUrl.toString()
    });
    
    return v2Err(
      'Ocorreu um erro ao deletar o gato',
      500,
      process.env.NODE_ENV !== 'production'
        ? ((error instanceof Error) ? error.message : 'Unknown error')
        : undefined
    );
  }
});

