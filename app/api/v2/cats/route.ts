import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { parseGender } from '@/lib/types/common';
import { requireHouseholdMember } from '@/lib/authz/household-access';
import { createCatSchema, feedingIntervalOf } from '@/lib/validations/cats';

// GET /api/v2/cats - Listar todos os gatos (filtragem opcional por householdId)
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  logger.debug('[GET /api/v2/cats] Authenticated user:', { userId: user.id, householdId: user.household_id });

  try {
    const userHouseholdIds = user.household_ids ?? [];
    
    logger.debug(`[GET /api/v2/cats] User ${user.id} authorized for households:`, { householdIds: userHouseholdIds });

    const searchParams = request.nextUrl.searchParams;
    const requestedHouseholdId = searchParams.get('householdId');

    let targetHouseholdIds: string[];

    if (requestedHouseholdId) {
      const access = await requireHouseholdMember(user.id, requestedHouseholdId);
      if (!access.ok) return access.response;
      targetHouseholdIds = [requestedHouseholdId];
      logger.debug(`[GET /api/v2/cats] Filtering by requested household: ${requestedHouseholdId}`);
    } else {
      if (userHouseholdIds.length === 0) {
        logger.info(`[GET /api/v2/cats] User ${user.id} belongs to no households. Returning empty.`);
        return NextResponse.json({ 
          success: true,
          data: [],
          count: 0
        });
      }
      targetHouseholdIds = userHouseholdIds;
      logger.debug(`[GET /api/v2/cats] Fetching for all authorized households.`);
    }

    // Define where clause based on authorized households
    const where = { 
      household_id: { 
        in: targetHouseholdIds 
      } 
    };

    logger.debug(`[GET /api/v2/cats] Querying cats with where clause:`, { where: JSON.stringify(where) });
    
    const cats = await prisma.cats.findMany({
      where,
      select: {
        id: true,
        name: true,
        photo_url: true,
        birth_date: true,
        weight: true,
        household_id: true,
        owner_id: true,
        created_at: true,
        updated_at: true,
        gender: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: cats,
      count: cats.length
    });
  } catch (error: any) {
    logger.logError(error, { message: 'Erro ao buscar gatos', requestUrl: request.nextUrl.toString() });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao buscar os gatos'
    }, { status: 500 });
  }
});

// POST /api/v2/cats - Criar um novo perfil de gato
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  logger.debug(`[POST /api/v2/cats] Authenticated user:`, { userId: user.id });

  try {
    const body = await request.json();
    logger.debug('[POST /api/v2/cats] Received request body:', body);

    const parsed = createCatSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('[POST /api/v2/cats] Invalid body:', parsed.error.format());
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: parsed.error.format()
      }, { status: 400 });
    }

    const data = parsed.data;
    const access = await requireHouseholdMember(user.id, data.householdId);
    if (!access.ok) return access.response;

    const createData: any = {
      name: data.name,
      photo_url: data.photoUrl || null,
      household_id: data.householdId,
      owner_id: user.id,
      restrictions: data.restrictions?.trim() || null,
      notes: data.notes?.trim() || null,
      gender: parseGender(data.gender),
      feeding_interval: feedingIntervalOf(data),
      portion_size: data.portion_size || null
    };

    if (data.weight !== undefined) {
      createData.weight = data.weight;
    }

    if (data.birthdate !== undefined) {
      createData.birth_date = data.birthdate ? new Date(data.birthdate) : null;
    }

    // Create the cat using Prisma's create method
    const newCat = await prisma.cats.create({
      data: createData
    });

    // If weight was provided, create an initial weight log using validated value
    if (newCat && data.weight !== null && data.weight !== undefined) {
      try {
        await prisma.cat_weight_logs.create({
          data: {
            cat_id: newCat.id,
            weight: data.weight,
            date: new Date(),
            measured_by: user.id,
          }
        });
        logger.debug(`[POST /api/v2/cats] Initial weight log created for cat ${newCat.id}`);
      } catch (logError: any) {
        logger.error(`[POST /api/v2/cats] Failed to create initial weight log for cat ${newCat.id}:`, {
          error: logError,
          message: logError.message,
          stack: logError.stack,
        });
      }
    }

    logger.debug(`[POST /api/v2/cats] Cat created successfully:`, newCat);
    return NextResponse.json({
      success: true,
      data: newCat
    }, { status: 201 });
  } catch (error: any) {
    logger.error('[POST /api/v2/cats] Error creating cat:', {
      error: error,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    if (error.code === '22P02') {
      return NextResponse.json({
        success: false,
        error: 'Formato inválido para um ou mais campos'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao criar o perfil do gato'
    }, { status: 500 });
  }
});

