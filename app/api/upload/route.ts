import { NextRequest, NextResponse } from 'next/server';
import { processImage, validateImage } from '@/lib/image-processing';
import { imageCache } from '@/lib/image-cache';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from 'next-auth/jwt';

// POST /api/upload - Fazer upload de uma imagem
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'user' | 'cat' | 'thumbnail' || 'user';
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'O arquivo deve ser uma imagem' },
        { status: 400 }
      );
    }

    // Criar diretório temporário para upload
    const tempDir = path.join(process.cwd(), 'tmp');
    await mkdir(tempDir, { recursive: true });
    
    // Salvar arquivo temporariamente
    const tempFileName = `${uuidv4()}-${file.name}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    const fileBuffer = await file.arrayBuffer();
    await writeFile(tempFilePath, Buffer.from(fileBuffer));

    try {
      // Validar imagem
      await validateImage(tempFilePath);

      // Processar imagem
      const processedImagePath = await processImage(tempFilePath, type, file.name);

      // Ler o arquivo processado
      const processedImageBuffer = await writeFile(tempFilePath, Buffer.from([]));

      // Adicionar ao cache
      await imageCache.set(processedImagePath, processedImageBuffer, type);

      // Retornar URL da imagem processada - ensure no double slashes
      const imageUrl = processedImagePath.startsWith('/') ? processedImagePath : `/${processedImagePath}`;
      return NextResponse.json({ url: imageUrl }, { status: 201 });
    } finally {
      // Limpar arquivo temporário
      await writeFile(tempFilePath, Buffer.from([]));
    }
  } catch (error) {
    console.error('Erro ao fazer upload de arquivo:', error);
    
    // Retornar mensagem de erro específica se disponível
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Ocorreu um erro ao fazer upload do arquivo' },
      { status: 500 }
    );
  }
}

// GET /api/upload/cache/stats - Obter estatísticas do cache
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const stats = imageCache.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas do cache:', error);
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas do cache' },
      { status: 500 }
    );
  }
} 