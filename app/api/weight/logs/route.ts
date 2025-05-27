import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { createRouteHandlerCookieStore } from '@/lib/supabase/cookie-store';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/prisma'; // Importar o cliente Prisma

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    const userId = request.headers.get('X-User-ID');

    console.log('[DEBUG][weight/logs][GET] householdId recebido:', householdId);
    console.log('[DEBUG][weight/logs][GET] userId recebido:', userId);

    if (!householdId) {
      console.error('[DEBUG][weight/logs][GET] Erro: ID da casa é obrigatório');
      return NextResponse.json(
        { error: 'ID da casa é obrigatório' },
        { status: 400 }
      );
    }

    if (!userId) {
      console.error('[DEBUG][weight/logs][GET] Erro: Usuário não autenticado');
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // --- Usar createClient do utilitário (mantido para auth.getUser se necessário, mas não para acesso a dados) ---
    const supabase = await createClient();
    // --- FIM ---

    // Logar o usuário autenticado pelo JWT recebido (ainda útil para depuração)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    console.log('[DEBUG][weight/logs][GET] Usuário autenticado pelo JWT:', authUser, 'Erro:', authError);

    // --- Verificar se o usuário tem acesso à casa usando Prisma ---
    console.log('[DEBUG][weight/logs][GET] Verificando acesso à casa usando Prisma...');
    const householdAccess = await prisma.household_members.findFirst({
      where: {
        household_id: householdId,
        user_id: userId,
      },
    });

    console.log('[DEBUG][weight/logs][GET] Resultado householdAccess (Prisma):', householdAccess);

    if (!householdAccess) {
      console.error('[DEBUG][weight/logs][GET] Falha na verificação de acesso (Prisma):', { householdAccess, householdId, userId, authUser });
      return NextResponse.json(
        { error: 'Acesso não autorizado' }, // Remover detalhes de debug no erro retornado
        { status: 403 }
      );
    }

    console.log('[DEBUG][weight/logs][GET] Acesso verificado com sucesso usando Prisma. Buscando logs de peso...');

    // --- Buscar logs de peso usando Prisma ---
    const weightLogs = await prisma.cat_weight_logs.findMany({
      where: {
        cat: {
          household_id: householdId,
        },
      },
      select: {
        id: true,
        cat_id: true,
        weight: true,
        date: true,
        notes: true,
        measured_by: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
    // --- FIM ---

    console.log('[DEBUG][weight/logs][GET] Logs de peso encontrados (Prisma):', weightLogs ? weightLogs.length : 0);

    return NextResponse.json(weightLogs);
  } catch (error: any) {
    console.error('[DEBUG][weight/logs][GET] Erro interno inesperado (Prisma):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error?.message || error },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    const userId = request.headers.get('X-User-ID');

    if (!householdId) {
      return NextResponse.json(
        { error: 'ID da casa é obrigatório' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { catId, weight, date, notes } = body;

    if (!catId || !weight || !date) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // --- Usar Prisma para operações de escrita (POST, PUT, DELETE) para consistência ---
    // Verificar se o gato pertence à casa usando Prisma
    const cat = await prisma.cats.findFirst({
      where: {
        id: catId,
        household_id: householdId,
      },
      select: {
        id: true
      }
    });

    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado ou acesso não autorizado' },
        { status: 403 }
      );
    }

    // Criar novo log de peso usando Prisma
    const newLog = await prisma.cat_weight_logs.create({
      data: {
        cat_id: catId,
        weight: parseFloat(weight), // Garantir que o peso seja Decimal/Float
        date: new Date(date), // Converter data string para Date
        notes: notes,
        measured_by: userId,
      },
    });

    // Atualizar peso atual do gato usando Prisma
    await prisma.cats.update({
      where: { id: catId },
      data: { weight: parseFloat(weight) }, // Atualizar com o novo peso e garantir Decimal/Float
    });
    // --- FIM ---

    return NextResponse.json(newLog);
  } catch (error: any) {
    console.error('Erro interno (POST):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error?.message || error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    const householdId = searchParams.get('householdId');
    const userId = request.headers.get('X-User-ID');

    if (!logId || !householdId) {
      return NextResponse.json(
        { error: 'ID do log e ID da casa são obrigatórios' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // --- Usar Prisma para operações de escrita (DELETE) ---
    // Verificar se o log pertence a um gato da casa usando Prisma
    const logToDelete = await prisma.cat_weight_logs.findUnique({
      where: { id: logId },
      select: {
        cat_id: true
      }
    });

    if (!logToDelete) {
      return NextResponse.json(
        { error: 'Log não encontrado' },
        { status: 404 }
      );
    }

    const cat = await prisma.cats.findFirst({
      where: {
        id: logToDelete.cat_id,
        household_id: householdId,
      },
      select: {
        id: true
      }
    });

    if (!cat) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Deletar o log usando Prisma
    await prisma.cat_weight_logs.delete({
      where: { id: logId },
    });

    // Atualizar peso atual do gato com o último log usando Prisma
    const lastLog = await prisma.cat_weight_logs.findFirst({
      where: { cat_id: logToDelete.cat_id },
      orderBy: { date: 'desc' },
      select: {
        weight: true
      }
    });

    await prisma.cats.update({
      where: { id: logToDelete.cat_id },
      data: { weight: lastLog ? lastLog.weight : null },
    });
    // --- FIM ---

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro interno (DELETE):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 