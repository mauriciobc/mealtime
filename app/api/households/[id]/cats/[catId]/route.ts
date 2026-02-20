import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/utils/supabase/server'; // Import Supabase client
import { cookies } from 'next/headers'; // Import cookies (required for Next.js 16)
import { BaseCat } from '@/lib/types/common';
import { z } from 'zod'; // Import Zod for validation

interface PrismaError extends Error {
  code?: string;
  stack?: string;
}

// Zod schema for route parameters (IDs are UUIDs, not numbers)
const RouteParamsSchema = z.object({
  id: z.string().uuid({ message: "ID do domicílio inválido" }),
  catId: z.string().uuid({ message: "ID do gato inválido" }),
});

// Zod schema for PATCH request body
const PatchBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  photoUrl: z.string().url().nullable().optional(),
  birthdate: z.string().datetime().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  restrictions: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  feedingInterval: z.number().int().min(1).max(24).optional(),
  portion_size: z.number().positive().optional(),
}).strict(); // Ensure no extra fields


// Helper function for authorization
async function authorizeUser(supabaseUser: any, householdId: string): Promise<{ authorized: boolean; prismaUserId?: string; error?: NextResponse }> {
  if (!supabaseUser) {
    return { authorized: false, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  }

  try {
    // Check if user is a member of the household
    const householdMember = await prisma.household_members.findFirst({
      where: { 
        user_id: supabaseUser.id,
        household_id: householdId 
      },
      select: { user_id: true },
    });

    if (!householdMember) {
      return { authorized: false, error: NextResponse.json({ error: 'Você não tem permissão para acessar este domicílio' }, { status: 403 }) };
    }

    return { authorized: true, prismaUserId: householdMember.user_id };
  } catch (error) {
    console.error('Authorization error:', error);
    return { authorized: false, error: NextResponse.json({ error: 'Erro interno do servidor durante autorização' }, { status: 500 }) };
  }
}


// GET /api/households/[id]/cats/[catId] - Obter um gato específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  // Validate route parameters
  const resolvedParams = await params;
  const paramsValidation = RouteParamsSchema.safeParse(resolvedParams);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: paramsValidation.error.issues }, { status: 400 });
  }

  const householdId = paramsValidation.data.id;
  const catId = paramsValidation.data.catId;

  await cookies();
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Authorize user
  const authResult = await authorizeUser(supabaseUser, householdId);
  if (!authResult.authorized) {
    return authResult.error!;
  }

  try {
    // Buscar o gato - já sabemos que o usuário pertence ao domicílio
    const cat = await prisma.cats.findFirst({
      where: {
        id: catId,
        household_id: householdId // Garante que o gato pertença ao domicílio correto
      },
      include: {
        schedules: true
      }
    });

    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado neste domicílio' },
        { status: 404 }
      );
    }

    // Formatar os dados para a resposta
    const formattedCat: BaseCat = {
      id: cat.id,
      name: cat.name,
      ...(cat.photo_url && { photoUrl: cat.photo_url }),
      ...(cat.birth_date && { birthdate: cat.birth_date }),
      ...(cat.weight && { weight: Number(cat.weight) }),
      ...(cat.restrictions && { restrictions: cat.restrictions }),
      ...(cat.gender != null && { gender: cat.gender as 'male' | 'female' }),
      householdId: cat.household_id,
      feedingInterval: cat.feeding_interval || 8
    };

    return NextResponse.json(formattedCat);
  } catch (error) {
    console.error('Erro ao buscar gato:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar o gato' },
      { status: 500 }
    );
  }
}

// PATCH /api/households/[id]/cats/[catId] - Atualizar um gato
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  const resolvedParams = await params;
  // Validate route parameters
  const paramsValidation = RouteParamsSchema.safeParse(resolvedParams);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: paramsValidation.error.issues }, { status: 400 });
  }

  const householdId = paramsValidation.data.id;
  const catId = paramsValidation.data.catId;

  await cookies();
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Authorize user
  const authResult = await authorizeUser(supabaseUser, householdId);
  if (!authResult.authorized) {
    return authResult.error!;
  }

  try {
    // Fetch the cat first to ensure it exists and belongs to the household
    const existingCat = await prisma.cats.findFirst({
      where: { id: catId, household_id: householdId },
    });

    if (!existingCat) {
      return NextResponse.json(
        { error: 'Gato não encontrado neste domicílio' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const bodyValidation = PatchBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json({ error: bodyValidation.error.issues }, { status: 400 });
    }

    console.log('Received update request with validated body:', bodyValidation.data);

    // Prepare update data, handling nullable fields correctly (use snake_case for DB fields)
    const updateData: any = {};
    if (bodyValidation.data.name !== undefined) updateData.name = bodyValidation.data.name;
    if (bodyValidation.data.photoUrl !== undefined) updateData.photo_url = bodyValidation.data.photoUrl; // Allow null
    if (bodyValidation.data.birthdate !== undefined) {
        updateData.birth_date = bodyValidation.data.birthdate ? new Date(bodyValidation.data.birthdate) : null;
    }
    if (bodyValidation.data.weight !== undefined) updateData.weight = bodyValidation.data.weight; // Allow null
    if (bodyValidation.data.restrictions !== undefined) updateData.restrictions = bodyValidation.data.restrictions; // Allow null
    if (bodyValidation.data.notes !== undefined) updateData.notes = bodyValidation.data.notes; // Allow null
    if (bodyValidation.data.feedingInterval !== undefined) updateData.feeding_interval = bodyValidation.data.feedingInterval;
    if (bodyValidation.data.portion_size !== undefined) updateData.portion_size = bodyValidation.data.portion_size;
    if (bodyValidation.data.gender !== undefined) updateData.gender = bodyValidation.data.gender;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "Nenhum dado válido para atualizar" }, { status: 400 });
    }

    console.log('Attempting to update cat with data:', updateData);

    // Atualizar o gato
    const updatedCat = await prisma.cats.update({
      where: { id: catId }, // Already verified householdId
      data: updateData
    });

    console.log('Cat updated successfully:', updatedCat);

    // Formatar os dados para a resposta (convert DB snake_case to camelCase)
    const formattedCat = {
      id: updatedCat.id,
      name: updatedCat.name,
      photoUrl: updatedCat.photo_url,
      birthdate: updatedCat.birth_date,
      weight: updatedCat.weight ? Number(updatedCat.weight) : null,
      restrictions: updatedCat.restrictions,
      notes: updatedCat.notes,
      gender: updatedCat.gender ?? null,
      feedingInterval: updatedCat.feeding_interval,
      portion_size: updatedCat.portion_size ? Number(updatedCat.portion_size) : null,
      householdId: updatedCat.household_id
    };

    return NextResponse.json(formattedCat);
  } catch (error: any) { // Changed PrismaError to any for broader catch
    console.error('Erro ao atualizar gato:', error);
    console.error('Stack trace:', error.stack);

    if (error.code === 'P2002') { // Prisma specific error code for unique constraint violation
      return NextResponse.json(
        { error: 'Conflito ao atualizar dados do gato' },
        { status: 409 }
      );
    }

    // P2025 indicates record to update not found, already handled by initial check
    // if (error.code === 'P2025') {
    //   return NextResponse.json(
    //     { error: 'Gato não encontrado' },
    //     { status: 404 }
    //   );
    // }

    return NextResponse.json(
      { error: 'Ocorreu um erro ao atualizar o gato' },
      { status: 500 }
    );
  }
}

// DELETE /api/households/[id]/cats/[catId] - Deletar um gato
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  const resolvedParams = await params;
  // Validate route parameters
  const paramsValidation = RouteParamsSchema.safeParse(resolvedParams);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: paramsValidation.error.issues }, { status: 400 });
  }

  const householdId = paramsValidation.data.id;
  const catId = paramsValidation.data.catId;

  await cookies();
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Authorize user
  const authResult = await authorizeUser(supabaseUser, householdId);
  if (!authResult.authorized) {
    return authResult.error!;
  }

  try {
     // Fetch the cat first to ensure it exists and belongs to the household
    const existingCat = await prisma.cats.findFirst({
      where: { id: catId, household_id: householdId },
    });

    if (!existingCat) {
      return NextResponse.json(
        { error: 'Gato não encontrado neste domicílio' },
        { status: 404 }
      );
    }

    // Deletar o gato
    await prisma.cats.delete({
      where: { id: catId } // Already verified householdId
    });

    return NextResponse.json({ message: 'Gato deletado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar gato:', error);
    console.error('Stack trace:', error.stack);

    // P2025 indicates record to delete not found, already handled by initial check
    // if (error.code === 'P2025') {
    //   return NextResponse.json(
    //     { error: 'Gato não encontrado' },
    //     { status: 404 }
    //   );
    // }
    
    return NextResponse.json(
      { error: 'Ocorreu um erro ao deletar o gato' },
      { status: 500 }
    );
  }
} 