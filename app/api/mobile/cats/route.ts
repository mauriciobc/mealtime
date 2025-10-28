import { NextRequest, NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/middleware/mobile-auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';

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

/**
 * GET /api/mobile/cats - Listar gatos (versão mobile)
 * 
 * Este endpoint é otimizado para aplicativos mobile e usa
 * o middleware de autenticação mobile.
 */
export const GET = withMobileAuth(async (request: NextRequest, user) => {
  try {
    if (!user.household_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuário não está associado a um household' 
        },
        { status: 403 }
      );
    }

    // Buscar gatos do household do usuário
    const cats = await prisma.cats.findMany({
      where: {
        household_id: user.household_id as string
      },
      select: {
        id: true,
        name: true,
        birth_date: true,
        weight: true,
        photo_url: true,
        household_id: true,
        created_at: true,
        updated_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    logger.info('[Mobile Cats] Retrieved cats', { 
      userId: user.id,
      householdId: user.household_id,
      count: cats.length 
    });

    return NextResponse.json({
      success: true,
      data: cats,
      count: cats.length
    });

  } catch (error: any) {
    logger.error('[Mobile Cats] Error retrieving cats', { 
      error: error?.message || String(error),
      userId: user.id 
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao buscar gatos' 
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/mobile/cats - Criar gato (versão mobile)
 */
export const POST = withMobileAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { name, birth_date, weight, photo_url } = body;

    if (!name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Nome do gato é obrigatório' 
        },
        { status: 400 }
      );
    }

    if (!user.household_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuário não está associado a um household' 
        },
        { status: 403 }
      );
    }

    // Validar peso
    const weightValidation = validateWeight(weight);
    if (!weightValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: weightValidation.error 
        },
        { status: 400 }
      );
    }

    // Validar data de nascimento
    const birthDateValidation = validateBirthDate(birth_date);
    if (!birthDateValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: birthDateValidation.error 
        },
        { status: 400 }
      );
    }

    const cat = await prisma.cats.create({
      data: {
        name,
        birth_date: birthDateValidation.value,
        weight: weightValidation.value,
        photo_url: photo_url || null,
        household_id: user.household_id as string,
        owner_id: user.id,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    logger.info('[Mobile Cats] Cat created', { 
      userId: user.id,
      catId: cat.id,
      catName: cat.name 
    });

    return NextResponse.json({
      success: true,
      data: cat
    }, { status: 201 });

  } catch (error: any) {
    logger.error('[Mobile Cats] Error creating cat', { 
      error: error?.message || String(error),
      userId: user.id 
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao criar gato' 
      },
      { status: 500 }
    );
  }
});
