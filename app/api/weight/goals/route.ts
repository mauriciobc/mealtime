import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json(
        { error: 'ID da casa é obrigatório' },
        { status: 400 }
      );
    }

    // Obter usuário autenticado via sessão Supabase
    const supabaseCheck = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabaseCheck.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }
    const userId = user.id;

    // Checar se o usuário é membro da household (Prisma: evita 403 por permissão Supabase na tabela)
    const householdAccess = await prisma.household_members.findFirst({
      where: { household_id: householdId, user_id: userId },
      select: { id: true },
    });
    if (!householdAccess) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Usar o client padrão do projeto, que já pega os cookies do request
    const supabase = await createServerSupabaseClient();

    // Buscar metas de peso
    // Primeiro, buscar os gatos da household
    const { data: cats, error: catsError } = await supabase
      .from('cats')
      .select('id')
      .eq('household_id', householdId);

    if (catsError) {
      console.error('Erro ao buscar gatos:', catsError);
      return NextResponse.json(
        { error: 'Erro ao buscar gatos' },
        { status: 500 }
      );
    }
    if (!cats || cats.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum gato encontrado para esta casa' },
        { status: 404 }
      );
    }

    const catIds = cats.map(cat => cat.id);

    const { data: weightGoals, error: weightError } = await supabase
      .from('weight_goals')
      .select(`
        id,
        cat_id,
        target_weight,
        target_date,
        start_weight,
        status,
        notes,
        created_by,
        created_at,
        updated_at
      `)
      .in('cat_id', catIds);

    if (weightError) {
      console.error('Erro ao buscar metas de peso:', weightError);
      return NextResponse.json(
        { error: 'Erro ao buscar metas de peso' },
        { status: 500 }
      );
    }

    return NextResponse.json(weightGoals);
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json(
        { error: 'ID da casa é obrigatório' },
        { status: 400 }
      );
    }

    // Obter usuário autenticado via sessão Supabase
    const supabaseCheck = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabaseCheck.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }
    const userId = user.id;

    // Checar se o usuário é membro da household (Prisma: evita 403 por permissão Supabase na tabela)
    const householdAccess = await prisma.household_members.findFirst({
      where: { household_id: householdId, user_id: userId },
      select: { id: true },
    });
    if (!householdAccess) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Validação com Zod
    const body = await request.json();
    const weightGoalSchema = z.object({
      catId: z.string().min(1, 'catId é obrigatório'),
      targetWeight: z.number(),
      targetDate: z.string().optional().nullable(),
      startWeight: z.number().optional().nullable(),
      notes: z.string().optional().nullable(),
      goalName: z.string(),
      unit: z.string(),
    });
    const parseResult = weightGoalSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const { catId, targetWeight, targetDate, startWeight, notes, goalName, unit } = parseResult.data;

    // Usar o client padrão do projeto, que já pega os cookies do request
    const supabase = await createServerSupabaseClient();

    // Verificar se o gato pertence à casa
    const { data: cat, error: catError } = await supabase
      .from('cats')
      .select('id')
      .eq('id', catId)
      .eq('household_id', householdId)
      .single();

    if (catError || !cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado ou acesso não autorizado' },
        { status: 403 }
      );
    }

    // Criar nova meta de peso
    const { data: newGoal, error: insertError } = await supabase
      .from('weight_goals')
      .insert({
        cat_id: catId,
        goal_name: goalName,
        target_weight: targetWeight,
        target_date: targetDate,
        start_weight: startWeight,
        unit: unit,
        status: 'active',
        notes,
        created_by: userId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar meta de peso:', insertError);
      return NextResponse.json(
        { error: 'Erro ao criar meta de peso' },
        { status: 500 }
      );
    }

    return NextResponse.json(newGoal);
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('id');
    const householdId = searchParams.get('householdId');

    if (!goalId || !householdId) {
      return NextResponse.json(
        { error: 'ID da meta e ID da casa são obrigatórios' },
        { status: 400 }
      );
    }

    // Obter usuário autenticado via sessão Supabase
    const supabaseCheck = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabaseCheck.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }
    const userId = user.id;

    // Checar se o usuário é membro da household (Prisma: evita 403 por permissão Supabase na tabela)
    const householdAccess = await prisma.household_members.findFirst({
      where: { household_id: householdId, user_id: userId },
      select: { id: true },
    });
    if (!householdAccess) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetWeight, targetDate, startWeight, status, notes, goalName, unit } = body;

    // Buscar meta e verificar se o gato pertence à household (Prisma: evita 404/403 por permissão Supabase)
    const goal = await prisma.weight_goals.findUnique({
      where: { id: goalId },
      select: { cat_id: true },
    });
    if (!goal) {
      return NextResponse.json(
        { error: 'Meta não encontrada' },
        { status: 404 }
      );
    }

    const cat = await prisma.cats.findFirst({
      where: { id: goal.cat_id, household_id: householdId },
      select: { id: true },
    });
    if (!cat) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Montar data apenas com campos definidos no body (cliente pode enviar só { status: "completed" })
    const updateData: Record<string, unknown> = {};
    if (targetWeight !== undefined) updateData.target_weight = targetWeight;
    if (targetDate !== undefined) updateData.target_date = targetDate ? new Date(targetDate) : null;
    if (startWeight !== undefined) updateData.start_weight = startWeight;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (goalName !== undefined) updateData.goal_name = goalName;
    if (unit !== undefined) updateData.unit = unit;

    const updatedGoal = await prisma.weight_goals.update({
      where: { id: goalId },
      data: updateData as Parameters<typeof prisma.weight_goals.update>[0]['data'],
    });

    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('id');
    const householdId = searchParams.get('householdId');

    if (!goalId || !householdId) {
      return NextResponse.json(
        { error: 'ID da meta e ID da casa são obrigatórios' },
        { status: 400 }
      );
    }

    // Obter usuário autenticado via sessão Supabase
    const supabaseCheck = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabaseCheck.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }
    const userId = user.id;

    // Checar se o usuário é membro da household (Prisma: evita 403 por permissão Supabase na tabela)
    const householdAccess = await prisma.household_members.findFirst({
      where: { household_id: householdId, user_id: userId },
      select: { id: true },
    });
    if (!householdAccess) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Usar o client padrão do projeto, que já pega os cookies do request
    const supabase = await createServerSupabaseClient();

    // Verificar se a meta pertence a um gato da casa
    const { data: goal, error: goalError } = await supabase
      .from('weight_goals')
      .select('cat_id')
      .eq('id', goalId)
      .single();

    if (goalError || !goal || !('cat_id' in goal)) {
      return NextResponse.json(
        { error: 'Meta não encontrada' },
        { status: 404 }
      );
    }

    const { data: cat, error: catError } = await supabase
      .from('cats')
      .select('id')
      .eq('id', goal.cat_id)
      .eq('household_id', householdId)
      .single();

    if (catError || !cat) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Deletar a meta
    const { error: deleteError } = await supabase
      .from('weight_goals')
      .delete()
      .eq('id', goalId);

    if (deleteError) {
      console.error('Erro ao deletar meta de peso:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao deletar meta de peso' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 