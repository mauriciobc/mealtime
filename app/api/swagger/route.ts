import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * GET /api/swagger
 * Serve o arquivo OpenAPI/Swagger YAML
 */
export async function GET(request: NextRequest) {
  try {
    const swaggerPath = join(process.cwd(), 'app', 'api', 'swagger.yaml');
    const swaggerContent = await readFile(swaggerPath, 'utf-8');

    return new NextResponse(swaggerContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-yaml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Erro ao ler arquivo swagger:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar a documentação da API' },
      { status: 500 }
    );
  }
}

