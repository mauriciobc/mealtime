import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Cat } from "@/lib/types";
import { z } from "zod";

const catSchema = z.object({
  name: z.string().min(1),
  photoUrl: z.string().url().optional(),
  birthdate: z.string().datetime().optional(),
  weight: z.number().positive().optional(),
  restrictions: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/households/[id]/cats - Listar gatos de um domicílio
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const householdId = parseInt(params.id);
    
    if (isNaN(householdId)) {
      return NextResponse.json(
        { error: 'ID de domicílio inválido' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário pertence ao domicílio
    const household = await prisma.household.findFirst({
      where: {
        id: householdId,
        users: {
          some: {
            email: session.user.email
          }
        }
      }
    });
    
    if (!household) {
      return NextResponse.json(
        { error: 'Domicílio não encontrado ou acesso não autorizado' },
        { status: 404 }
      );
    }
    
    // Buscar todos os gatos da residência
    const cats = await prisma.cat.findMany({
      where: {
        householdId: householdId
      }
    });
    
    return NextResponse.json(cats);
  } catch (error) {
    console.error('Erro ao buscar gatos:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os gatos' },
      { status: 500 }
    );
  }
}

// POST /api/households/[id]/cats - Adicionar gato ao domicílio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const householdId = parseInt(params.id);
    
    if (isNaN(householdId)) {
      return NextResponse.json(
        { error: 'ID de domicílio inválido' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário pertence ao domicílio
    const household = await prisma.household.findFirst({
      where: {
        id: householdId,
        users: {
          some: {
            email: session.user.email
          }
        }
      }
    });
    
    if (!household) {
      return NextResponse.json(
        { error: 'Domicílio não encontrado ou acesso não autorizado' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const validationResult = catSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Criar o gato no banco de dados
    const cat = await prisma.cat.create({
      data: {
        name: data.name,
        photoUrl: data.photoUrl,
        birthdate: data.birthdate ? new Date(data.birthdate) : null,
        weight: data.weight,
        restrictions: data.restrictions,
        notes: data.notes,
        householdId: householdId
      }
    });

    // Converter para o formato da interface Cat
    const formattedCat: Cat = {
      id: cat.id.toString(),
      name: cat.name,
      photoUrl: cat.photoUrl || undefined,
      birthdate: cat.birthdate || undefined,
      weight: cat.weight || undefined,
      dietaryRestrictions: cat.restrictions ? [cat.restrictions] : undefined,
      medicalNotes: cat.notes || undefined,
      regularAmount: "0", // Valor padrão
      foodUnit: "g", // Unidade padrão
      feedingSchedules: [],
      householdId: cat.householdId.toString()
    };

    return NextResponse.json(formattedCat, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar gato:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar o gato' },
      { status: 500 }
    );
  }
} 