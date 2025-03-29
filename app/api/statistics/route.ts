import { NextRequest, NextResponse } from "next/server";
import { getFeedingStatistics } from "@/lib/services/api/statistics-service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, subMonths } from "date-fns";

// GET /api/statistics - Obter estatísticas de alimentação
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Sessão do usuário:", session);
    
    if (!session?.user?.householdId) {
      console.log("Usuário não tem householdId");
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7dias";
    const catId = searchParams.get("catId") || "todos";

    console.log("Parâmetros recebidos:", { period, catId, householdId: session.user.householdId });

    const stats = await getFeedingStatistics(
      period,
      catId,
      session.user.householdId
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