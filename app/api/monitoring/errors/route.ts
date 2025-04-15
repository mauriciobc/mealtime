import { NextResponse } from 'next/server';
import { ErrorReport } from '@/types/monitoring';
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const errorReportSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  timestamp: z.string(),
  context: z.record(z.unknown()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    // Validar dados recebidos
    const validationResult = errorReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dados de erro inválidos', details: validationResult.error },
        { status: 400 }
      );
    }

    const errorReport = validationResult.data;

    // Adicionar informações do usuário se disponíveis
    if (session?.user?.id) {
      errorReport.userId = session.user.id;
    }

    // Log do erro
    logger.error('Erro reportado pelo cliente', {
      ...errorReport,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    // TODO: Armazenar erro no banco de dados
    // TODO: Notificar equipe se erro for crítico
    // TODO: Agregar erros similares

    return NextResponse.json({ message: 'Erro registrado com sucesso' });
  } catch (error) {
    logger.error('Falha ao processar erro do cliente', { error });
    return NextResponse.json(
      { error: 'Erro interno ao processar erro' },
      { status: 500 }
    );
  }
} 