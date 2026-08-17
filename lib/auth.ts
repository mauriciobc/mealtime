import { NextRequest, NextResponse } from 'next/server';
import { validateHybridAuth } from './middleware/hybrid-auth';
import { ApiResponse } from '@/lib/responses/api-responses';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  householdId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Extrai o ID do usuário autenticado da requisição
 * Suporta tanto JWT (mobile) quanto Supabase Session (web)
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  const authResult = await validateHybridAuth(request);

  if (!authResult.success || !authResult.user) {
    return {
      success: false,
      error: authResult.error || 'Unauthorized',
      statusCode: authResult.statusCode || 401,
    };
  }

  return {
    success: true,
    user: {
      id: authResult.user.id,
      email: authResult.user.email || undefined,
      householdId: authResult.user.household_id || undefined,
    },
  };
}

/**
 * Wrapper para API routes que requerem autenticação
 * Retorna erro 401 automaticamente se não autenticado
 */
export function withAuth<
  P extends Record<string, unknown> = Record<string, unknown>
>(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    context?: { params: Promise<P> }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<NextResponse> => {
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.success) {
      return ApiResponse.error(
        authResult.error || 'Unauthorized',
        authResult.statusCode || 401,
        'AUTH_ERROR',
        undefined,
        request
      );
    }

    return handler(request, authResult.user!, context);
  };
}

/**
 * Middleware function to require authentication in API routes
 * Use this inside your route handlers
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: AuthenticatedUser;
  error: null;
} | {
  user: null;
  error: { message: string; status: number };
}> {
  const result = await getAuthenticatedUser(request);

  if (!result.success) {
    return {
      user: null,
      error: {
        message: result.error || 'Unauthorized',
        status: result.statusCode || 401
      }
    };
  }

  return {
    user: result.user!,
    error: null
  };
}
