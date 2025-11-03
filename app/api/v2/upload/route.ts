import { NextRequest, NextResponse } from 'next/server';
import { processImage, validateImage } from '@/lib/image-processing';
import { imageCache } from '@/lib/image-cache';
import { writeFile, unlink, readFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';

// POST /api/v2/upload - Fazer upload de uma imagem
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  let tempFilePath: string | null = null;
  
  logger.debug('[POST /api/v2/upload] Authenticated user:', { userId: user.id });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = (formData.get('type') as 'user' | 'cat' | 'thumbnail') || 'user';
    
    if (!file) {
      logger.warn('[POST /api/v2/upload] No file provided');
      return NextResponse.json({
        success: false,
        error: 'Nenhum arquivo enviado'
      }, { status: 400 });
    }

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      logger.warn('[POST /api/v2/upload] File is not an image:', { fileType: file.type });
      return NextResponse.json({
        success: false,
        error: 'O arquivo deve ser uma imagem'
      }, { status: 400 });
    }

    // Criar diretório temporário para upload
    const tempDir = path.join(process.cwd(), 'tmp');
    await mkdir(tempDir, { recursive: true });
    
    // Salvar arquivo temporariamente
    const tempFileName = `${uuidv4()}-${file.name}`;
    tempFilePath = path.join(tempDir, tempFileName);
    const fileBuffer = await file.arrayBuffer();
    await writeFile(tempFilePath, Buffer.from(fileBuffer));

    logger.debug('[POST /api/v2/upload] File saved to temp path:', { tempFilePath });

    // Validar imagem
    await validateImage(tempFilePath);

    // Processar imagem
    const processedImagePath = await processImage(tempFilePath, type, file.name);

    logger.debug('[POST /api/v2/upload] Image processed:', { processedImagePath });

    // Ler o arquivo processado e adicionar ao cache
    const processedImageBuffer = await readFile(tempFilePath);
    await imageCache.set(processedImagePath, processedImageBuffer);

    // Return URL of processed image
    const imageUrl = processedImagePath.startsWith('/') ? processedImagePath : `/${processedImagePath}`;
    
    logger.info('[POST /api/v2/upload] Upload successful:', { imageUrl, userId: user.id });

    return NextResponse.json({
      success: true,
      data: { url: imageUrl }
    }, { status: 201 });
  } catch (error: any) {
    logger.logError(error, {
      message: 'Erro ao fazer upload de arquivo',
      requestUrl: request.nextUrl.toString()
    });
    
    // Retornar mensagem de erro específica se disponível
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao fazer upload do arquivo'
    }, { status: 500 });
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        logger.debug('[POST /api/v2/upload] Temp file cleaned up:', { tempFilePath });
      } catch (error) {
        logger.error('[POST /api/v2/upload] Error cleaning up temp file:', { 
          error,
          tempFilePath 
        });
      }
    }
  }
});

