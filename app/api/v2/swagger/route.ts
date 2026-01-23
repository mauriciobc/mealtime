import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

function getCorsOrigin(): string {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  return allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '*';
}

/**
 * GET /api/v2/swagger
 * Serve o arquivo OpenAPI/Swagger YAML da v2
 */
export async function GET(request: NextRequest) {
  try {
    const swaggerPath = join(process.cwd(), 'app', 'api', 'swagger-v2.yaml');
    const swaggerContent = await readFile(swaggerPath, 'utf-8');

    return new NextResponse(swaggerContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-yaml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': getCorsOrigin(),
      },
    });
  } catch (error) {
    console.error('Erro ao ler arquivo swagger v2:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar a documentação da API v2' },
      { status: 500 }
    );
  }
}

