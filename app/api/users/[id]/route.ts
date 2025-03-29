import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRepository } from '@/lib/repositories';
import { BaseUser, ID } from '@/lib/types/common';

// GET /api/users/[id] - Obter informações de um usuário específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar se o usuário está autenticado
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const userId = parseInt(params.id, 10) as ID;
    
    // Verificar se o usuário está tentando acessar seus próprios dados
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }
    
    // Buscar os dados do usuário
    const user = await UserRepository.getById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Retornar os dados do usuário (excluindo senha)
    const response: BaseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
      language: user.language,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os dados do usuário' },
      { status: 500 }
    );
  }
} 