import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { createRouteHandlerCookieStore } from '@/lib/supabase/cookie-store';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

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

    // Checar se o usuário é membro da household
    const { data: householdAccess, error: accessError } = await supabaseCheck
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single();
    if (accessError || !householdAccess) {
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
    if (!cats) {
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

    // Checar se o usuário é membro da household
    const { data: householdAccess, error: accessError } = await supabaseCheck
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single();
    if (accessError || !householdAccess) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { catId, targetWeight, targetDate, startWeight, notes, goalName, unit } = body;

    if (!catId || !targetWeight || !goalName || !unit) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Corrigir uso de cookies para o client
    const cookieStore = cookies;
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore() });

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

    // Checar se o usuário é membro da household
    const { data: householdAccess, error: accessError } = await supabaseCheck
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single();
    if (accessError || !householdAccess) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetWeight, targetDate, startWeight, status, notes, goalName, unit } = body;

    // Corrigir uso de cookies para o client
    const cookieStore = cookies;
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore() });

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

    // Atualizar a meta
    const { data: updatedGoal, error: updateError } = await supabase
      .from('weight_goals')
      .update({
        target_weight: targetWeight,
        target_date: targetDate,
        start_weight: startWeight,
        status,
        notes,
        goal_name: goalName,
        unit: unit
      })
      .eq('id', goalId)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar meta de peso:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar meta de peso' },
        { status: 500 }
      );
    }

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

    // Checar se o usuário é membro da household
    const { data: householdAccess, error: accessError } = await supabaseCheck
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single();
    if (accessError || !householdAccess) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Corrigir uso de cookies para o client
    const cookieStore = cookies;
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore() });

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