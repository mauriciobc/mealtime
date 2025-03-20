import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/feedings/[id] - Buscar detalhes de um registro de alimentação
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const feedingLog = await prisma.feedingLog.findUnique({
      where: { id },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!feedingLog) {
      return NextResponse.json(
        { error: 'Registro de alimentação não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(feedingLog);
  } catch (error) {
    console.error('Erro ao buscar registro de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar o registro de alimentação' },
      { status: 500 }
    );
  }
}

// DELETE /api/feedings/[id] - Excluir um registro de alimentação
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se o registro existe
    const existingLog = await prisma.feedingLog.findUnique({
      where: { id }
    });

    if (!existingLog) {
      return NextResponse.json(
        { error: 'Registro de alimentação não encontrado' },
        { status: 404 }
      );
    }

    // Excluir o registro
    await prisma.feedingLog.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir registro de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao excluir o registro de alimentação' },
      { status: 500 }
    );
  }
} 