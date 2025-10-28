import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma'; // Assuming UserRepository uses prisma indirectly or we need it here
import { UserRepository } from '@/lib/repositories';
import { BaseUser, ID } from '@/lib/types/common';

// GET /api/users/[id] - Obter informações de um usuário específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const userId = resolvedParams.id;
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !supabaseUser) {
      console.error('GET /api/users/[id] Auth Error:', authError);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Security Check: Ensure the logged-in user matches the userId param
    if (supabaseUser.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Fetch the user profile data
    const user = await prisma.profiles.findUnique({
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
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Retornar os dados do usuário
    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os dados do usuário' },
      { status: 500 }
    );
  }
} 