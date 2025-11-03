import { NextRequest, NextResponse } from 'next/server';
import { processImage, validateImage } from '@/lib/image-processing';
import { imageCache } from '@/lib/image-cache';
import { writeFile, unlink, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { ImageValidationError } from '@/lib/image-errors';
import { ValidationError } from '@/lib/utils/error-handler';

// Configuração de limite máximo de upload
// Permite configuração via env (MAX_UPLOAD_SIZE_MB em MB) ou usa padrão de 50MB
const MAX_UPLOAD_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// POST /api/v2/upload - Fazer upload de uma imagem
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  let tempFilePath: string | null = null;
  let processedImagePath: string | undefined;
  
  logger.debug('[POST /api/v2/upload] Authenticated user:', { userId: user.id });

  try {
    const formData = await request.formData();
    
    // Validar que 'file' existe e é uma instância de File
    const fileValue = formData.get('file');
    if (!fileValue) {
      logger.warn('[POST /api/v2/upload] No file provided');
      return NextResponse.json({
        success: false,
        error: 'Um arquivo válido deve ser enviado'
      }, { status: 400 });
    }
    
    if (!(fileValue instanceof File)) {
      logger.warn('[POST /api/v2/upload] File value is not a File instance:', { 
        fileValueType: typeof fileValue
      });
      return NextResponse.json({
        success: false,
        error: 'Um arquivo válido deve ser enviado'
      }, { status: 400 });
    }
    
    const file = fileValue;
    
    // Validar que 'type' é uma string e um dos valores permitidos
    const typeValue = formData.get('type');
    const allowedTypes = ['user', 'cat', 'thumbnail'] as const;
    let type: 'user' | 'cat' | 'thumbnail' = 'user';
    
    if (typeValue && typeof typeValue === 'string') {
      const normalizedType = typeValue.trim().toLowerCase();
      if (allowedTypes.includes(normalizedType as typeof type)) {
        type = normalizedType as typeof type;
      } else {
        logger.warn('[POST /api/v2/upload] Invalid type value, using default "user":', { 
          providedType: typeValue 
        });
      }
    } else if (typeValue !== null) {
      logger.warn('[POST /api/v2/upload] Type is not a string, using default "user":', { 
        typeValue: typeof typeValue 
      });
    }

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      logger.warn('[POST /api/v2/upload] File is not an image:', { fileType: file.type });
      return NextResponse.json({
        success: false,
        error: 'O arquivo deve ser uma imagem'
      }, { status: 400 });
    }

    // Validar tamanho do arquivo ANTES de carregar na memória
    // file.size geralmente está disponível em objetos File do navegador
    if (typeof file.size === 'number' && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) {
        logger.warn('[POST /api/v2/upload] File size exceeds limit:', { 
          fileSize: file.size, 
          maxSize: MAX_UPLOAD_BYTES,
          fileName: file.name 
        });
        return NextResponse.json({
          success: false,
          error: `O arquivo excede o tamanho máximo permitido de ${MAX_UPLOAD_SIZE_MB}MB`
        }, { status: 413 });
      }
    }

    // Criar diretório temporário para upload
    const tempDir = path.join(process.cwd(), 'tmp');
    await mkdir(tempDir, { recursive: true });
    
    // Salvar arquivo temporariamente
    const tempFileName = `${uuidv4()}-${file.name}`;
    tempFilePath = path.join(tempDir, tempFileName);

    // Processar arquivo com validação de tamanho
    // Se file.size não estiver disponível, usar streaming com contador de bytes
    if (typeof file.size === 'number' && file.size > 0) {
      // file.size disponível - pode processar normalmente
      const fileBuffer = await file.arrayBuffer();
      await writeFile(tempFilePath, Buffer.from(fileBuffer));
    } else {
      // file.size não disponível - usar streaming com contador de bytes
      const readableStream = file.stream();
      const writeStream = createWriteStream(tempFilePath);
      let bytesRead = 0;
      let streamAborted = false;

      try {
        const reader = readableStream.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunkSize = value.byteLength || value.length;
          bytesRead += chunkSize;
          
          if (bytesRead > MAX_UPLOAD_BYTES) {
            streamAborted = true;
            reader.cancel();
            writeStream.destroy();
            throw new Error('File size exceeds maximum allowed size');
          }
          
          if (!writeStream.write(Buffer.from(value))) {
            // Aguardar dreno se o buffer estiver cheio
            await new Promise<void>((resolve) => {
              writeStream.once('drain', resolve);
            });
          }
        }
        
        writeStream.end();
        
        // Aguardar conclusão da escrita
        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        });
      } catch (error) {
        if (!streamAborted) {
          writeStream.destroy();
        }
        // Limpar arquivo parcial se foi criado
        try {
          await unlink(tempFilePath);
        } catch (unlinkError) {
          // Ignorar erro de limpeza
        }
        
        if (error instanceof Error && error.message.includes('exceeds maximum')) {
          logger.warn('[POST /api/v2/upload] File size exceeded during streaming:', { 
            bytesRead,
            maxSize: MAX_UPLOAD_BYTES,
            fileName: file.name 
          });
          return NextResponse.json({
            success: false,
            error: `O arquivo excede o tamanho máximo permitido de ${MAX_UPLOAD_SIZE_MB}MB`
          }, { status: 413 });
        }
        throw error;
      }
    }

    logger.debug('[POST /api/v2/upload] File saved to temp path:', { tempFilePath });

    // Validar imagem
    await validateImage(tempFilePath);

    // Processar imagem
    processedImagePath = await processImage(tempFilePath, type, file.name);

    logger.debug('[POST /api/v2/upload] Image processed:', { processedImagePath });

    // Ler o arquivo processado e adicionar ao cache
    const processedImageBuffer = await readFile(processedImagePath);
    await imageCache.set(processedImagePath, processedImageBuffer);

    // Return URL of processed image
    const imageUrl = processedImagePath.startsWith('/') ? processedImagePath : `/${processedImagePath}`;
    
    logger.info('[POST /api/v2/upload] Upload successful:', { imageUrl, userId: user.id });

    return NextResponse.json({
      success: true,
      data: { url: imageUrl }
    }, { status: 201 });
  } catch (error: any) {
    // Logar o erro completo com todos os detalhes no servidor
    logger.logError(error instanceof Error ? error : new Error(String(error)), {
      message: 'Erro ao fazer upload de arquivo',
      requestUrl: request.nextUrl.toString(),
      userId: user.id,
      tempFilePath,
      processedImagePath
    });
    
    // Determinar o status HTTP baseado no tipo de erro
    const isValidationError = 
      error instanceof ImageValidationError ||
      error instanceof ValidationError ||
      (error instanceof Error && 
       ('status' in error && typeof error.status === 'number' && error.status >= 400 && error.status < 500)) ||
      (error instanceof Error && 
       ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500));
    
    const httpStatus = isValidationError ? 400 : 500;
    
    // Retornar mensagem genérica e segura para o cliente
    if (isValidationError) {
      // Para erros de validação, retornar mensagem mais específica mas ainda segura
      const safeMessage = error instanceof ImageValidationError 
        ? 'A imagem não atende aos requisitos. Por favor, verifique o tamanho e formato.'
        : 'Os dados enviados são inválidos. Por favor, verifique e tente novamente.';
      
      return NextResponse.json({
        success: false,
        error: safeMessage
      }, { status: httpStatus });
    }

    // Para erros do servidor, sempre retornar mensagem genérica
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao fazer upload do arquivo'
    }, { status: httpStatus });
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
    
    // Clean up processed image file
    if (processedImagePath) {
      try {
        await unlink(processedImagePath);
        logger.debug('[POST /api/v2/upload] Processed image file cleaned up:', { processedImagePath });
      } catch (error) {
        logger.error('[POST /api/v2/upload] Error cleaning up processed image file:', { 
          error,
          processedImagePath 
        });
      }
    }
  }
});

