import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';

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

// GET /api/v2/cats - Listar todos os gatos (filtragem opcional por householdId)
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  logger.debug('[GET /api/v2/cats] Authenticated user:', { userId: user.id, householdId: user.household_id });

  try {
    // Get user's households for authorization
    const userProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { household_members: { select: { household_id: true } } }
    });

    if (!userProfile) {
      logger.error(`[GET /api/v2/cats] Prisma profile not found for auth user ID: ${user.id}`);
      return NextResponse.json({ 
        success: false,
        error: 'Perfil de usuário não encontrado' 
      }, { status: 404 });
    }

    const userHouseholdIds = userProfile.household_members.map(m => m.household_id);
    if (userHouseholdIds.length === 0) {
      logger.info(`[GET /api/v2/cats] User ${user.id} belongs to no households. Returning empty.`);
      return NextResponse.json({ 
        success: true,
        data: [],
        count: 0
      });
    }
    
    logger.debug(`[GET /api/v2/cats] User ${user.id} authorized for households:`, { householdIds: userHouseholdIds });

    const searchParams = request.nextUrl.searchParams;
    const requestedHouseholdId = searchParams.get('householdId');

    let targetHouseholdIds: string[];

    if (requestedHouseholdId) {
      // If a specific household is requested, check authorization
      if (!userHouseholdIds.includes(requestedHouseholdId)) {
        logger.warn(`[GET /api/v2/cats] User ${user.id} not authorized for requested household ${requestedHouseholdId}`);
        return NextResponse.json({ 
          success: false,
          error: 'Não autorizado para este domicílio' 
        }, { status: 403 });
      }
      targetHouseholdIds = [requestedHouseholdId];
      logger.debug(`[GET /api/v2/cats] Filtering by requested household: ${requestedHouseholdId}`);
    } else {
      // If no specific household is requested, fetch for all user's households
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
        updated_at: true
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

    // Validate required fields
    if (!body.name || !body.householdId) {
      logger.warn('[POST /api/v2/cats] Missing required fields:', { body });
      return NextResponse.json({
        success: false,
        error: 'Nome e ID do domicílio são obrigatórios'
      }, { status: 400 });
    }

    // Validate feeding interval (if provided)
    let feedingInterval = null;
    if (body.feeding_interval) {
      const hours = parseInt(String(body.feeding_interval));
      if (isNaN(hours) || hours < 1 || hours > 24) {
        logger.warn('[POST /api/v2/cats] Invalid feeding interval:', body.feeding_interval);
        return NextResponse.json({
          success: false,
          error: 'Intervalo de alimentação deve ser entre 1 e 24 horas'
        }, { status: 400 });
      }
      feedingInterval = hours;
    }

    // Validar peso se fornecido
    if (body.weight !== undefined) {
      const weightValidation = validateWeight(body.weight);
      if (!weightValidation.isValid) {
        logger.warn('[POST /api/v2/cats] Invalid weight:', body.weight);
        return NextResponse.json({
          success: false,
          error: weightValidation.error
        }, { status: 400 });
      }
    }

    // Validar data de nascimento se fornecida
    if (body.birthdate !== undefined) {
      const birthDateValidation = validateBirthDate(body.birthdate);
      if (!birthDateValidation.isValid) {
        logger.warn('[POST /api/v2/cats] Invalid birthdate:', body.birthdate);
        return NextResponse.json({
          success: false,
          error: birthDateValidation.error
        }, { status: 400 });
      }
    }

    // Check if the user is a member of the target household
    const householdMember = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: body.householdId
      },
      select: { user_id: true }
    });

    if (!householdMember) {
      logger.warn(`[POST /api/v2/cats] User ${user.id} not authorized for household ${body.householdId}`);
      return NextResponse.json({
        success: false,
        error: 'Usuário não autorizado para este domicílio'
      }, { status: 403 });
    }

    // Preparar dados para criação com validações aplicadas
    const createData: any = {
      name: body.name.trim(),
      photo_url: body.photoUrl || null,
      household_id: body.householdId,
      owner_id: user.id,
      restrictions: body.restrictions?.trim() || null,
      notes: body.notes?.trim() || null,
      feeding_interval: feedingInterval,
      portion_size: body.portion_size || null
    };

    // Aplicar validações de peso e data de nascimento
    if (body.weight !== undefined) {
      const weightValidation = validateWeight(body.weight);
      createData.weight = weightValidation.value;
    }

    if (body.birthdate !== undefined) {
      const birthDateValidation = validateBirthDate(body.birthdate);
      createData.birth_date = birthDateValidation.value;
    }

    // Create the cat using Prisma's create method
    const newCat = await prisma.cats.create({
      data: createData
    });

    // If weight was provided, create an initial weight log
    if (newCat && body.weight && !isNaN(parseFloat(body.weight))) {
      try {
        await prisma.cat_weight_logs.create({
          data: {
            cat_id: newCat.id,
            weight: parseFloat(body.weight),
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
      error: `Erro ao criar o perfil do gato: ${error.message}`
    }, { status: 500 });
  }
});

