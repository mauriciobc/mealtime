import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { z } from 'zod';

// Schema de validação para atualização de usuário
const updateUserSchema = z.object({
  full_name: z.string().min(1).refine((val) => val.trim().length > 0, {
    message: 'Nome completo não pode ser apenas espaços em branco'
  }).optional(),
  username: z.string().min(1).refine((val) => val.trim().length > 0, {
    message: 'Nome de usuário não pode ser apenas espaços em branco'
  }).optional(),
  avatar_url: z.string().url().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido para atualização',
});

// GET /api/v2/users/[id] - Obter informações do usuário
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const resolvedParams = await Promise.resolve(context?.params).catch(() => ({ id: user.id })) || { id: user.id };
    const userId = resolvedParams.id;

    logger.debug('[GET /api/v2/users/[id]] Authenticated user:', { 
      authenticatedUserId: user.id, 
      requestedUserId: userId 
    });

    // Security Check: Ensure the logged-in user matches the userId param
    if (user.id !== userId) {
      logger.warn('[GET /api/v2/users/[id]] User attempted to access another user data:', {
        authenticatedUserId: user.id,
        requestedUserId: userId
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado. Você só pode acessar seus próprios dados.'
      }, { status: 403 });
    }

    // Fetch the user profile data
    const userProfile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        timezone: true,
        avatar_url: true,
      }
    });

    if (!userProfile) {
      logger.warn('[GET /api/v2/users/[id]] User not found:', { userId });
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    logger.info('[GET /api/v2/users/[id]] User profile retrieved successfully:', { userId });

    return NextResponse.json({
      success: true,
      data: userProfile
    });
  } catch (error: any) {
    logger.logError(error, { 
      message: 'Erro ao buscar usuário',
      requestUrl: request.nextUrl.toString() 
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao buscar os dados do usuário'
    }, { status: 500 });
  }
});

// PUT /api/v2/users/[id] - Atualizar informações do usuário
export const PUT = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const resolvedParams = await Promise.resolve(context?.params).catch(() => ({ id: user.id })) || { id: user.id };
    const userId = resolvedParams.id;

    logger.debug('[PUT /api/v2/users/[id]] Authenticated user:', { 
      authenticatedUserId: user.id, 
      requestedUserId: userId 
    });

    // Security Check: Ensure the logged-in user matches the userId param
    if (user.id !== userId) {
      logger.warn('[PUT /api/v2/users/[id]] User attempted to update another user data:', {
        authenticatedUserId: user.id,
        requestedUserId: userId
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado. Você só pode atualizar seus próprios dados.'
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[PUT /api/v2/users/[id]] Invalid request body:', {
        errors: validationResult.error.format()
      });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Build update object only with provided fields
    const updatePayload: any = {};
    if (updateData.full_name !== undefined) {
      updatePayload.full_name = updateData.full_name.trim();
    }
    if (updateData.username !== undefined) {
      updatePayload.username = updateData.username.trim();
    }
    if (updateData.avatar_url !== undefined) {
      updatePayload.avatar_url = updateData.avatar_url;
    }

    // Update the user profile
    let updatedUser;
    try {
      updatedUser = await prisma.profiles.update({
        where: { id: userId },
        data: updatePayload,
        select: {
          id: true,
          username: true,
          full_name: true,
          email: true,
          timezone: true,
          avatar_url: true,
        }
      });
    } catch (updateError: any) {
      // Handle Prisma unique constraint errors (e.g., duplicate username)
      if (updateError.code === 'P2002') {
        logger.warn('[PUT /api/v2/users/[id]] Username already exists:', { userId });
        return NextResponse.json({
          success: false,
          error: 'Este nome de usuário já está em uso'
        }, { status: 409 });
      }
      // Re-throw to be handled by outer catch block
      throw updateError;
    }

    logger.info('[PUT /api/v2/users/[id]] User profile updated successfully:', { userId });

    return NextResponse.json({
      success: true,
      data: updatedUser
    });
  } catch (error: any) {
    // Handle Prisma unique constraint errors (e.g., duplicate username)
    if (error.code === 'P2002') {
      const resolvedParams = await Promise.resolve(context?.params).catch(() => ({ id: user.id })) || { id: user.id };
      logger.warn('[PUT /api/v2/users/[id]] Username already exists:', { userId: resolvedParams.id });
      return NextResponse.json({
        success: false,
        error: 'Este nome de usuário já está em uso'
      }, { status: 409 });
    }

    // Handle Prisma errors
    if (error.code === 'P2025') {
      const resolvedParams = await Promise.resolve(context?.params).catch(() => ({ id: user.id })) || { id: user.id };
      logger.warn('[PUT /api/v2/users/[id]] User not found for update:', { userId: resolvedParams.id });
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    logger.logError(error, { 
      message: 'Erro ao atualizar usuário',
      requestUrl: request.nextUrl.toString() 
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao atualizar os dados do usuário'
    }, { status: 500 });
  }
});

