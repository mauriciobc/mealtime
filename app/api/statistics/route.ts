import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, subMonths } from "date-fns";

// GET /api/statistics - Obter estatísticas de alimentação
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }
    
    // Obter parâmetros da consulta
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "7dias";
    const catId = searchParams.get("catId") || "todos";
    
    // Definir intervalo de datas com base no período
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "7dias":
        startDate = subDays(now, 7);
        break;
      case "30dias":
        startDate = subDays(now, 30);
        break;
      case "3meses":
        startDate = subMonths(now, 3);
        break;
      default:
        startDate = subDays(now, 7);
    }
    
    // Construir a query base
    const baseQuery: any = {
      where: {
        timestamp: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        cat: true,
        user: true,
      },
    };
    
    // Filtrar por gato, se especificado
    if (catId !== "todos") {
      baseQuery.where.catId = parseInt(catId);
    }
    
    // Buscar registros de alimentação
    const feedingLogs = await prisma.feedingLog.findMany(baseQuery);
    
    // Calcular estatísticas
    const totalFeedings = feedingLogs.length;
    
    // Calcular porção média
    const validPortions = feedingLogs.filter((log) => log.portionSize !== null && log.portionSize > 0);
    const averagePortionSize = validPortions.length > 0
      ? validPortions.reduce((sum, log) => sum + (log.portionSize || 0), 0) / validPortions.length
      : 0;
    
    // Em um sistema completo, calcularíamos também:
    // - Número máximo de dias consecutivos com alimentação
    // - Número de alimentações perdidas
    const maxConsecutiveDays = 0; // Seria calculado com base no histórico
    const missedSchedules = 0; // Seria calculado comparando com agendamentos
    
    // Obter os gatos únicos
    const catIds = [...new Set(feedingLogs.map((log) => log.catId))];
    const cats = await prisma.cat.findMany({
      where: {
        id: {
          in: catIds,
        },
      },
    });
    
    return NextResponse.json({
      totalFeedings,
      averagePortionSize,
      maxConsecutiveDays,
      missedSchedules,
      feedingLogs,
      cats,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao buscar as estatísticas de alimentação" },
      { status: 500 }
    );
  }
} 