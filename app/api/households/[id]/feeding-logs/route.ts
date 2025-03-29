import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BaseFeedingLog } from '@/lib/types/common';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user) {
      console.log('Usuário não autenticado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    const { id } = await context.params;
    console.log('Buscando logs para household:', id);

    // Validar se a household existe
    const household = await prisma.household.findUnique({
      where: { id: parseInt(id) }
    });

    if (!household) {
      console.log('Household não encontrada:', id);
      return NextResponse.json(
        { error: 'Household não encontrada' },
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    // Verificar se o usuário tem acesso à household
    if (session.user.householdId !== parseInt(id)) {
      console.log('Usuário não tem acesso à household:', id);
      return NextResponse.json(
        { error: 'Acesso negado' },
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Buscar os logs de alimentação através do relacionamento com os gatos
    const logs = await prisma.feedingLog.findMany({
      where: {
        cat: {
          householdId: parseInt(id)
        }
      },
      include: {
        cat: true,
        user: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Converter para o formato BaseFeedingLog
    const formattedLogs: BaseFeedingLog[] = logs.map(log => ({
      id: log.id,
      catId: log.catId,
      userId: log.userId,
      timestamp: log.timestamp,
      portionSize: log.portionSize || undefined,
      notes: log.notes || undefined,
      createdAt: log.createdAt,
      status: log.status || undefined
    }));

    console.log('Logs encontrados:', formattedLogs.length);
    return NextResponse.json(formattedLogs, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Erro ao buscar logs de alimentação:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar logs de alimentação' },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
} 