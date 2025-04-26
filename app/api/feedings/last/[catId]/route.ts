import { NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server'; // Import Supabase client
import { cookies } from 'next/headers'; // Import cookies

export async function GET(
  request: Request,
  { params }: { params: { catId: string } }
) {
  // const session = await getServerSession(authOptions);
  const cookieStore = cookies(); // Get cookies
  const supabase = createClient(cookieStore); // Create Supabase client
  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(); // Get Supabase user

  // if (!session?.user?.id) {
  if (authError || !supabaseUser) { // Check Supabase user
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const catId = parseInt(params.catId);

  if (isNaN(catId)) {
    return NextResponse.json({ error: 'ID do gato inválido' }, { status: 400 });
  }

  try {
    // Fetch the user's household ID from Prisma using Supabase ID
    const prismaUser = await prisma.user.findUnique({
      where: { auth_id: supabaseUser.id },
      select: { householdId: true }
    });

    if (!prismaUser?.householdId) {
      return NextResponse.json({ error: 'Usuário não associado a uma residência' }, { status: 403 });
    }

    // Verify the cat belongs to the user's household *before* querying logs
    const cat = await prisma.cat.findUnique({
      where: {
        id: catId,
        householdId: prismaUser.householdId
      },
      select: { id: true } // Only need ID for verification
    });

    if (!cat) {
      // Cat doesn't exist or doesn't belong to the user's household
      return NextResponse.json({ error: 'Gato não encontrado ou acesso não autorizado' }, { status: 404 });
    }

    // Now that access is confirmed, find the last feeding log for this specific cat
    const lastFeeding = await prisma.feedingLog.findFirst({
      where: {
        catId: catId, // Already verified this cat belongs to the user's household
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (!lastFeeding) {
      return NextResponse.json(null, { status: 200 }); // Return null if no feeding log exists for this cat
    }

    return NextResponse.json(lastFeeding);
  } catch (error) {
    console.error(`Erro ao buscar último registro de alimentação para o gato ${catId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 