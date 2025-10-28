import { NextResponse } from "next/server";
import { getFeedingStatistics } from "@/lib/services/api/statistics-service";
import { createClient } from "@/utils/supabase/server";
import prisma from '@/lib/prisma';

// GET /api/statistics - Obter estatísticas de alimentação
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !supabaseUser) {
      console.error('GET /api/statistics Auth Error:', authError);
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Fetch Prisma user profile to get householdId
    const userProfile = await prisma.profiles.findUnique({
        where: { id: supabaseUser.id },
        select: { household_members: { select: { household_id: true } } }
    });

    if (!userProfile) {
        console.error('Authenticated user not found in Prisma:', supabaseUser.id);
        return NextResponse.json(
          { error: "Perfil de usuário não encontrado" },
          { status: 404 }
        );
    }

    const userHouseholdIds = userProfile.household_members.map(m => m.household_id);
    if (userHouseholdIds.length === 0) {
        console.error('User has no households:', supabaseUser.id);
        return NextResponse.json(
          { error: "Usuário não associado a nenhum domicílio" },
          { status: 403 }
        );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7dias";
    const catId = searchParams.get("catId") || "todos";
    // Use the first household (or could accept householdId as param)
    // Safe to use ! because we already checked the array is not empty above
    const householdId = userHouseholdIds[0]!;

    console.log("Parâmetros recebidos:", { period, catId, householdId });

    const stats = await getFeedingStatistics(
      period,
      catId,
      householdId
    );

    console.log("Estatísticas calculadas:", stats);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
} 