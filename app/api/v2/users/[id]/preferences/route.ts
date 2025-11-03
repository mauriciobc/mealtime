import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { z } from 'zod';

// Schema de validação para atualização de preferências
const updatePreferencesSchema = z.object({
  language: z.string().min(1, 'Language é obrigatório'),
  timezone: z.string().min(1, 'Timezone é obrigatório'),
});

// GET /api/v2/users/[id]/preferences - Obter preferências do usuário
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const resolvedParams = await context?.params || { id: user.id };
    const userId = resolvedParams.id;

    logger.debug('[GET /api/v2/users/[id]/preferences] Authenticated user:', { 
      authenticatedUserId: user.id, 
      requestedUserId: userId 
    });

    // Security Check: Ensure the logged-in user matches the userId param
    if (user.id !== userId) {
      logger.warn('[GET /api/v2/users/[id]/preferences] User attempted to access another user preferences:', {
        authenticatedUserId: user.id,
        requestedUserId: userId
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado. Você só pode acessar suas próprias preferências.'
      }, { status: 403 });
    }

    // Fetch the user profile to get preferences
    const userProfile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        id: true,
        timezone: true,
      }
    });

    if (!userProfile) {
      logger.warn('[GET /api/v2/users/[id]/preferences] User not found:', { userId });
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    // Note: The profiles table only stores timezone, not language
    // Language is not stored in the database currently
    // Returning null for language as it's not persisted
    const preferences = {
      timezone: userProfile.timezone || '',
      language: null as string | null, // Language not stored in database
    };

    logger.info('[GET /api/v2/users/[id]/preferences] User preferences retrieved successfully:', { userId });

    return NextResponse.json({
      success: true,
      data: preferences
    });
  } catch (error: any) {
    logger.logError(error, { 
      message: 'Erro ao buscar preferências do usuário',
      requestUrl: request.nextUrl.toString() 
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao buscar as preferências do usuário'
    }, { status: 500 });
  }
});

// PUT /api/v2/users/[id]/preferences - Atualizar preferências do usuário
export const PUT = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const resolvedParams = await context?.params || { id: user.id };
    const userId = resolvedParams.id;

    logger.debug('[PUT /api/v2/users/[id]/preferences] Authenticated user:', { 
      authenticatedUserId: user.id, 
      requestedUserId: userId 
    });

    // Security Check: Ensure the logged-in user matches the userId param
    if (user.id !== userId) {
      logger.warn('[PUT /api/v2/users/[id]/preferences] User attempted to update another user preferences:', {
        authenticatedUserId: user.id,
        requestedUserId: userId
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado. Você só pode atualizar suas próprias preferências.'
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updatePreferencesSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[PUT /api/v2/users/[id]/preferences] Invalid request body:', {
        errors: validationResult.error.format()
      });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { timezone, language } = validationResult.data;

    // Note: The profiles table only has timezone field, not language
    // We update timezone and log that language was provided but not persisted
    const updatedProfile = await prisma.profiles.update({
      where: { id: userId },
      data: {
        timezone: timezone,
      },
      select: {
        id: true,
        timezone: true,
      }
    });

    logger.info('[PUT /api/v2/users/[id]/preferences] User preferences updated successfully:', { 
      userId,
      timezoneUpdated: true,
      languageProvided: !!language,
      note: 'Language provided but not persisted (not stored in database)'
    });

    // Return the updated preferences
    // Note: Language is not persisted, so we return the provided value or null
    const preferences = {
      timezone: updatedProfile.timezone || '',
      language: language || null, // Return the provided language even though not persisted
    };

    return NextResponse.json({
      success: true,
      data: preferences
    });
  } catch (error: any) {
    // Handle Prisma errors
    if (error.code === 'P2025') {
      const resolvedParams = await context?.params || { id: user.id };
      logger.warn('[PUT /api/v2/users/[id]/preferences] User not found for update:', { userId: resolvedParams.id });
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    logger.logError(error, { 
      message: 'Erro ao atualizar preferências do usuário',
      requestUrl: request.nextUrl.toString() 
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao atualizar as preferências do usuário'
    }, { status: 500 });
  }
});

