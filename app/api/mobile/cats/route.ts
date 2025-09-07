import { NextRequest, NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/middleware/mobile-auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';

/**
 * GET /api/mobile/cats - Listar gatos (versão mobile)
 * 
 * Este endpoint é otimizado para aplicativos mobile e usa
 * o middleware de autenticação mobile.
 */
export const GET = withMobileAuth(async (request: NextRequest, user) => {
  try {
    // Buscar gatos do household do usuário
    const cats = await prisma.cat.findMany({
      where: {
        household_id: user.household_id
      },
      select: {
        id: true,
        name: true,
        breed: true,
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

  } catch (error) {
    logger.error('[Mobile Cats] Error retrieving cats', { 
      error: error.message,
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
    const { name, breed, birth_date, weight, photo_url } = body;

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

    const cat = await prisma.cat.create({
      data: {
        name,
        breed: breed || null,
        birth_date: birth_date ? new Date(birth_date) : null,
        weight: weight ? parseFloat(weight) : null,
        photo_url: photo_url || null,
        household_id: user.household_id,
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

  } catch (error) {
    logger.error('[Mobile Cats] Error creating cat', { 
      error: error.message,
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
