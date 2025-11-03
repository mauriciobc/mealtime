import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { z } from 'zod';

// Schema de validação para atualização de perfil
const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  avatar_url: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  timezone: z.string().max(50).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido para atualização',
});

// GET /api/v2/profile/[idOrUsername] - Buscar perfil público do usuário
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ idOrUsername: string }> }
) => {
  try {
    const resolvedParams = await context?.params || { idOrUsername: '' };
    const { idOrUsername } = resolvedParams;

    if (!idOrUsername) {
      logger.warn('[GET /api/v2/profile/[idOrUsername]] Missing idOrUsername parameter');
      return NextResponse.json({
        success: false,
        error: 'ID ou username é obrigatório'
      }, { status: 400 });
    }

    logger.debug('[GET /api/v2/profile/[idOrUsername]] Authenticated user:', { 
      userId: user.id,
      requestedIdOrUsername: idOrUsername
    });

    // Detecta se é UUID (id) ou username
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrUsername);
    const userWhere = isUuid
      ? { id: idOrUsername }
      : { username: idOrUsername };

    // Busca perfil do usuário com lares, membros e gatos
    const profile = await prisma.profiles.findUnique({
      where: userWhere,
      select: {
        id: true,
        username: true,
        full_name: true,
        avatar_url: true,
        email: true,
        timezone: true,
        household_members: {
          select: {
            role: true,
            household: {
              select: {
                id: true,
                name: true,
                description: true,
                cats: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                household_members: {
                  select: {
                    user: {
                      select: {
                        id: true,
                        full_name: true,
                        avatar_url: true,
                        email: true,
                      },
                    },
                    role: true,
                  },
                },
              },
            },
          },
        },
        owned_cats: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            weight: true,
            weight_logs: {
              orderBy: { date: 'desc' },
              take: 1,
              select: { weight: true, date: true },
            },
            feeding_logs: {
              orderBy: { fed_at: 'desc' },
              take: 1,
              select: { fed_at: true },
            },
          },
        },
      },
    });

    if (!profile) {
      logger.warn('[GET /api/v2/profile/[idOrUsername]] Profile not found:', { idOrUsername });
      return NextResponse.json({
        success: false,
        error: 'Perfil não encontrado'
      }, { status: 404 });
    }

    logger.info('[GET /api/v2/profile/[idOrUsername]] Profile retrieved successfully:', { 
      profileId: profile.id 
    });

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    logger.logError(error, {
      message: 'Erro ao buscar perfil',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
});

// PUT /api/v2/profile/[idOrUsername] - Atualizar perfil público do usuário
export const PUT = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ idOrUsername: string }> }
) => {
  try {
    const resolvedParams = await context?.params || { idOrUsername: '' };
    const { idOrUsername } = resolvedParams;

    if (!idOrUsername) {
      logger.warn('[PUT /api/v2/profile/[idOrUsername]] Missing idOrUsername parameter');
      return NextResponse.json({
        success: false,
        error: 'ID ou username é obrigatório'
      }, { status: 400 });
    }

    logger.debug('[PUT /api/v2/profile/[idOrUsername]] Authenticated user:', { 
      userId: user.id,
      requestedIdOrUsername: idOrUsername
    });

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrUsername);
    const userWhere = isUuid
      ? { id: idOrUsername }
      : { username: idOrUsername };

    // Só permite editar o próprio perfil
    const profile = await prisma.profiles.findUnique({ where: userWhere });
    if (!profile) {
      logger.warn('[PUT /api/v2/profile/[idOrUsername]] Profile not found:', { idOrUsername });
      return NextResponse.json({
        success: false,
        error: 'Perfil não encontrado'
      }, { status: 404 });
    }

    // Security check: usuário só pode atualizar seu próprio perfil
    if (profile.id !== user.id) {
      logger.warn('[PUT /api/v2/profile/[idOrUsername]] User attempted to update another user profile:', {
        authenticatedUserId: user.id,
        profileUserId: profile.id
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado. Você só pode atualizar seu próprio perfil.'
      }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);
    
    if (!validationResult.success) {
      logger.warn('[PUT /api/v2/profile/[idOrUsername]] Invalid request body:', {
        errors: validationResult.error.format()
      });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const data = validationResult.data;
    // Build update data object, only including defined values
    const updateData: any = {};
    Object.keys(data).forEach((k) => {
      const key = k as keyof typeof data;
      const value = data[key];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    const updated = await prisma.profiles.update({
      where: { id: profile.id },
      data: updateData,
    });

    logger.info('[PUT /api/v2/profile/[idOrUsername]] Profile updated successfully:', { 
      profileId: profile.id 
    });

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    // Handle Prisma errors
    if (error.code === 'P2025') {
      logger.warn('[PUT /api/v2/profile/[idOrUsername]] Profile not found during update');
      return NextResponse.json({
        success: false,
        error: 'Perfil não encontrado'
      }, { status: 404 });
    }

    logger.logError(error, {
      message: 'Erro ao editar perfil',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
});

