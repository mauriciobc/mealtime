import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';

// POST /api/upload - Fazer upload de uma imagem
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
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

    // Limitar tamanho (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'O tamanho da imagem não pode exceder 5MB' },
        { status: 400 }
      );
    }

    // Gerar nome único para o arquivo
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    // Criar diretório para upload caso não exista
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    // Caminho completo do arquivo
    const filePath = path.join(uploadDir, fileName);
    
    // Salvar o arquivo
    const fileBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(fileBuffer));
    
    // URL pública do arquivo
    const fileUrl = `/uploads/${fileName}`;
    
    return NextResponse.json({ url: fileUrl }, { status: 201 });
  } catch (error) {
    console.error('Erro ao fazer upload de arquivo:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao fazer upload do arquivo' },
      { status: 500 }
    );
  }
} 