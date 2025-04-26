import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/utils/supabase/server'; // Import Supabase client
import { cookies } from 'next/headers'; // Import cookies
// import { getToken } from 'next-auth/jwt'; // Remove next-auth jwt
import { z } from 'zod'; // Import Zod for validation

// Zod schema for request body
const JoinBodySchema = z.object({
  inviteCode: z.string().min(1, "Código de convite é obrigatório"),
}).strict();

// POST /api/households/join - Entrar em um domicílio usando um código de convite
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !supabaseUser) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const bodyValidation = JoinBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json({ error: bodyValidation.error.errors }, { status: 400 });
    }

    const { inviteCode } = bodyValidation.data;

    // Buscar o domicílio pelo código de convite
    const household = await prisma.household.findUnique({
      where: { inviteCode: inviteCode },
      include: {
        users: {
          select: {
            id: true,
            auth_id: true, // Select auth_id to check if user is already present
            name: true,
            email: true,
            role: true
          }
        },
        cats: true
      }
    });

    if (!household) {
      return NextResponse.json({ error: 'Código de convite inválido' }, { status: 404 });
    }

    // Fetch the corresponding Prisma user using the Supabase user ID (auth_id)
    const prismaUser = await prisma.user.findUnique({
      where: { auth_id: supabaseUser.id },
      select: { id: true, householdId: true } // Select existing householdId
    });

    if (!prismaUser) {
      // This case should ideally not happen if the auth trigger works, but handle it defensively.
      return NextResponse.json({ error: 'Usuário não encontrado no banco de dados local.' }, { status: 404 });
    }

    // Check if user is already associated with this household (via Prisma user record)
    if (prismaUser.householdId === household.id) {
      return NextResponse.json({ error: 'Você já pertence a este domicílio' }, { status: 400 });
    }

    // Check if user is already associated with *another* household
    // Decide on policy: allow joining multiple? Overwrite? For now, let's prevent joining if already in one.
    if (prismaUser.householdId) {
        return NextResponse.json({ error: 'Você já pertence a outro domicílio. Saia do domicílio atual antes de entrar em um novo.' }, { status: 400 });
    }

    // Adicionar usuário ao domicílio como membro (Update the Prisma user record)
    await prisma.user.update({
      where: { id: prismaUser.id }, // Use the found Prisma user ID
      data: {
        householdId: household.id,
        role: 'member' // Novos usuários sempre entram como membros
      },
    });

    // Buscar o domicílio atualizado com todos os membros para a resposta
    const updatedHousehold = await prisma.household.findUnique({
      where: { id: household.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        cats: true // Include cats if needed in the response
      }
    });

    if (!updatedHousehold) {
      // This is unlikely if the update succeeded, but handle defensively
      return NextResponse.json({ error: 'Erro ao buscar domicílio atualizado após entrada' }, { status: 500 });
    }

    // Formatar a resposta (adjust based on frontend needs)
    const formattedHousehold = {
      id: updatedHousehold.id,
      name: updatedHousehold.name,
      inviteCode: updatedHousehold.inviteCode, // Might want to omit this from general responses
      members: updatedHousehold.users.map(user => ({
        id: user.id, // Use number or string based on frontend
        name: user.name,
        email: user.email, // Consider privacy implications
        role: user.role
      })),
      cats: updatedHousehold.cats // Include cats data
    };

    // No need to manually update JWT token; state should be refreshed on client-side
    // based on context updates or page reload after action.

    // Return the details of the household joined
    return NextResponse.json(formattedHousehold);

  } catch (error) {
    console.error('Erro ao entrar no domicílio:', error);
    // Handle potential Prisma errors (e.g., unique constraints if invite codes weren't unique)
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'Erro de conflito ao processar a solicitação.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro ao entrar no domicílio' }, { status: 500 });
  }
} 