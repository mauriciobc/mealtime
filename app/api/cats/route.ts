import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { getAuthenticatedUser, AuthenticatedUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/responses/api-responses';
import { parseGender } from '@/lib/types/common';

const MAX_CAT_AGE_YEARS = 30;
const MAX_CAT_WEIGHT_KG = 50;
const MIN_FEEDING_INTERVAL_HOURS = 1;
const MAX_FEEDING_INTERVAL_HOURS = 24;

function validateWeight(weight: unknown): { isValid: boolean; value: number | null; error?: string } {
  if (weight === null || weight === undefined || weight === '') {
    return { isValid: true, value: null };
  }

  const weightNum = Number(parseFloat(String(weight)));
  
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

  if (weightNum > MAX_CAT_WEIGHT_KG) {
    return { 
      isValid: false, 
      value: null, 
      error: `Peso deve ser menor que ${MAX_CAT_WEIGHT_KG}kg` 
    };
  }

  return { isValid: true, value: weightNum };
}

function validateBirthDate(birth_date: unknown): { isValid: boolean; value: Date | null; error?: string } {
  if (birth_date === null || birth_date === undefined || birth_date === '') {
    return { isValid: true, value: null };
  }

  const date = new Date(String(birth_date));
  
  if (isNaN(date.getTime())) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Data de nascimento deve ser uma data válida' 
    };
  }

  const now = new Date();
  if (date > now) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Data de nascimento não pode ser no futuro' 
    };
  }

  const thirtyYearsAgo = new Date();
  thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - MAX_CAT_AGE_YEARS);
  if (date < thirtyYearsAgo) {
    return { 
      isValid: false, 
      value: null, 
      error: `Data de nascimento não pode ser há mais de ${MAX_CAT_AGE_YEARS} anos` 
    };
  }

  return { isValid: true, value: date };
}

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  
  if (!authResult.success) {
    return ApiResponse.error(
      authResult.error || 'Not authenticated',
      authResult.statusCode || 401,
      'AUTH_ERROR',
      undefined,
      request
    );
  }

  const user: AuthenticatedUser = authResult.user!;

  try {
    const userProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { 
        household_members: { select: { household_id: true } } 
      }
    });

    if (!userProfile) {
      return ApiResponse.notFound('Perfil de usuário não encontrado', request);
    }

    const userHouseholdIds = userProfile.household_members.map(m => m.household_id);
    
    if (userHouseholdIds.length === 0) {
      return ApiResponse.success([], 200, request);
    }

    const searchParams = request.nextUrl.searchParams;
    const requestedHouseholdId = searchParams.get('householdId');

    let targetHouseholdIds: string[];

    if (requestedHouseholdId) {
      if (!userHouseholdIds.includes(requestedHouseholdId)) {
        return ApiResponse.forbidden('Não autorizado para este domicílio', request);
      }
      targetHouseholdIds = [requestedHouseholdId];
    } else {
      targetHouseholdIds = userHouseholdIds;
    }

    const cats = await prisma.cats.findMany({
      where: { 
        household_id: { 
          in: targetHouseholdIds 
        } 
      },
      select: {
        id: true,
        name: true,
        photo_url: true,
        birth_date: true,
        weight: true,
        household_id: true,
        owner_id: true,
        gender: true
      },
      orderBy: { name: 'asc' }
    });

    return ApiResponse.success(cats, 200, request);
  } catch (error) {
    return ApiResponse.error('Erro ao buscar gatos', 500, 'INTERNAL_ERROR', error, request);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  
  if (!authResult.success) {
    return ApiResponse.error(
      authResult.error || 'Not authenticated',
      authResult.statusCode || 401,
      'AUTH_ERROR',
      undefined,
      request
    );
  }

  const user: AuthenticatedUser = authResult.user!;

  try {
    const body = await request.json();

    if (!body.name || !body.householdId) {
      return ApiResponse.error('Nome e ID do domicílio são obrigatórios', 400, 'VALIDATION_ERROR', undefined, request);
    }

    let feedingInterval: number | null = null;
    if (body.feeding_interval) {
      const hours = parseInt(String(body.feeding_interval), 10);
      if (isNaN(hours) || hours < MIN_FEEDING_INTERVAL_HOURS || hours > MAX_FEEDING_INTERVAL_HOURS) {
        return ApiResponse.error(
          `Intervalo de alimentação deve ser entre ${MIN_FEEDING_INTERVAL_HOURS} e ${MAX_FEEDING_INTERVAL_HOURS} horas`,
          400,
          'VALIDATION_ERROR',
          undefined,
          request
        );
      }
      feedingInterval = hours;
    }

    const weightValidation = validateWeight(body.weight);
    if (body.weight !== undefined && !weightValidation.isValid) {
      return ApiResponse.error(weightValidation.error || 'Peso inválido', 400, 'VALIDATION_ERROR', undefined, request);
    }

    const birthDateValidation = validateBirthDate(body.birthdate);
    if (body.birthdate !== undefined && !birthDateValidation.isValid) {
      return ApiResponse.error(birthDateValidation.error || 'Data inválida', 400, 'VALIDATION_ERROR', undefined, request);
    }

    const householdMember = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: body.householdId
      },
      select: { user_id: true }
    });

    if (!householdMember) {
      return ApiResponse.forbidden('Usuário não autorizado para este domicílio', request);
    }

    const createData = {
      name: body.name.trim(),
      photo_url: body.photoUrl?.trim() || null,
      household_id: body.householdId,
      owner_id: user.id,
      restrictions: body.restrictions?.trim() || null,
      notes: body.notes?.trim() || null,
      gender: parseGender(body.gender),
      feeding_interval: feedingInterval,
      portion_size: body.portion_size || null,
      weight: weightValidation.value,
      birth_date: birthDateValidation.value
    };

    const newCat = await prisma.cats.create({
      data: createData
    });

    if (body.weight !== undefined && weightValidation.value !== null) {
      try {
        await prisma.cat_weight_logs.create({
          data: {
            cat_id: newCat.id,
            weight: weightValidation.value,
            date: new Date(),
            measured_by: user.id
          }
        });
      } catch (logError) {
        logger.error('Failed to create initial weight log', { catId: newCat.id, error: logError });
      }
    }

    return ApiResponse.success(newCat, 201, request);
  } catch (error) {
    logger.error('Error creating cat', { error });
    
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === '22P02') {
      return ApiResponse.error('Formato inválido para um ou mais campos', 400, 'VALIDATION_ERROR', undefined, request);
    }
    
    return ApiResponse.error(
      `Erro ao criar o perfil do gato: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      'INTERNAL_ERROR',
      undefined,
      request
    );
  }
}
