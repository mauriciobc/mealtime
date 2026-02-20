import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withError } from "@/lib/utils/api-middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from 'next/headers';

/**
 * Valida e normaliza o peso do gato
 */
function validateWeight(weight: any): { isValid: boolean; value: number | null; error?: string } {
  if (weight === null || weight === undefined || weight === '') {
    return { isValid: true, value: null };
  }

  const weightNum = Number(parseFloat(weight));
  
  if (Number.isNaN(weightNum)) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Peso deve ser um número válido' 
    };
  }

  if (weightNum < 0) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Peso não pode ser negativo' 
    };
  }

  // Validação adicional: peso máximo razoável para um gato (50kg)
  if (weightNum > 50) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Peso deve ser menor que 50kg' 
    };
  }

  return { isValid: true, value: weightNum };
}

/**
 * Valida e normaliza a data de nascimento do gato
 */
function validateBirthDate(birth_date: any): { isValid: boolean; value: Date | null; error?: string } {
  if (birth_date === null || birth_date === undefined || birth_date === '') {
    return { isValid: true, value: null };
  }

  const date = new Date(birth_date);
  
  if (isNaN(date.getTime())) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Data de nascimento deve ser uma data válida' 
    };
  }

  // Validação adicional: data não pode ser no futuro
  const now = new Date();
  if (date > now) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Data de nascimento não pode ser no futuro' 
    };
  }

  // Validação adicional: data não pode ser muito antiga (mais de 30 anos)
  const thirtyYearsAgo = new Date();
  thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
  if (date < thirtyYearsAgo) {
    return { 
      isValid: false, 
      value: null, 
      error: 'Data de nascimento não pode ser há mais de 30 anos' 
    };
  }

  return { isValid: true, value: date };
}

// Helper function to create Supabase client in API routes using async cookie store
async function createSupabaseRouteClient() {
  const cookieStore = await cookies();

  // Define the async cookie store based on utils/supabase/server.ts pattern
  const asyncCookieStore = {
    async get(name: string) {
      // Always use await with cookies()
      return (await cookieStore).get(name)?.value;
    },
    async set(name: string, value: string, options: CookieOptions) {
      try {
        // Always use await with cookies()
        (await cookieStore).set({ name, value, ...options });
      } catch (error) {
        // Handle potential errors during cookie setting in API routes
        console.error(`[Supabase Route Client] Error setting cookie ${name}:`, error);
      }
    },
    async remove(name: string, options: CookieOptions) {
      try {
        // Always use await with cookies()
        (await cookieStore).set({ name, value: '', ...options });
      } catch (error) {
        // Handle potential errors during cookie removal in API routes
        console.error(`[Supabase Route Client] Error removing cookie ${name}:`, error);
      }
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: asyncCookieStore, // Use the async store
    }
  );
}

// GET /api/cats/[catId] - Get cat by ID
export const GET = withError(async (request: Request, { params }: { params: Promise<{ catId: string }> }) => {
  const supabase = await createSupabaseRouteClient();
  const { catId } = await params;
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error(`[GET /api/cats/${catId}] Auth error:`, authError);
      return new NextResponse(JSON.stringify({ error: "Authentication failed" }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`[GET /api/cats/${catId}] Fetching cat for user ${user.id}`);

    // Get the cat and verify the user has access through their household
    const cat = await prisma.cats.findFirst({
      where: {
        id: catId,
        household: {
          household_members: {
            some: {
              user_id: user.id
            }
          }
        }
      },
      include: {
        household: true,
        owner: true,
        schedules: true
      }
    });

    if (!cat) {
      console.log(`[GET /api/cats/${catId}] Cat not found or access denied for user ${user.id}`);
      return new NextResponse(JSON.stringify({ error: "Cat not found or access denied" }), { 
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`[GET /api/cats/${catId}] Successfully fetched cat for user ${user.id}`);
    return NextResponse.json(cat, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`[GET /api/cats/${catId}] Error:`, error);
    return new NextResponse(
      "Internal Server Error", 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

// PUT /api/cats/[catId] - Update a cat
export const PUT = withError(async (request: Request, { params }: { params: Promise<{ catId: string }> }) => {
  const supabase = await createSupabaseRouteClient();
  const { catId } = await params;
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  const body = await request.json();

  // Validar peso se fornecido
  if (body.weight !== undefined) {
    const weightValidation = validateWeight(body.weight);
    if (!weightValidation.isValid) {
      return new NextResponse(JSON.stringify({ error: weightValidation.error }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Validar data de nascimento se fornecida
  if (body.birthDate !== undefined) {
    const birthDateValidation = validateBirthDate(body.birthDate);
    if (!birthDateValidation.isValid) {
      return new NextResponse(JSON.stringify({ error: birthDateValidation.error }), { 
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Get the cat and verify the user has access through their household
  const cat = await prisma.cats.findFirst({
    where: {
      id: catId,
      household: {
        household_members: {
          some: {
            user_id: user.id
          }
        }
      }
    }
  });

  if (!cat) {
    return new NextResponse(JSON.stringify({ error: "Cat not found or access denied" }), { 
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Preparar dados para atualização com validações aplicadas
  const updateData: any = {};
  
  if (body.name !== undefined) {
    updateData.name = body.name;
  }
  
  if (body.birthDate !== undefined) {
    const birthDateValidation = validateBirthDate(body.birthDate);
    updateData.birth_date = birthDateValidation.value;
  }
  
  if (body.weight !== undefined) {
    const weightValidation = validateWeight(body.weight);
    updateData.weight = weightValidation.value;
  }
  
  if (body.photoUrl !== undefined) {
    updateData.photo_url = body.photoUrl;
  }

  if (body.gender !== undefined) {
    updateData.gender = body.gender;
  }

  // Update the cat
  const updatedCat = await prisma.cats.update({
    where: {
      id: catId
    },
    data: updateData,
    include: {
      household: true,
      owner: true,
      schedules: true
    }
  });

  return NextResponse.json(updatedCat, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
});

// DELETE /api/cats/[catId] - Delete a cat
export const DELETE = withError(async (request: Request, { params }: { params: Promise<{ catId: string }> }) => {
  const supabase = await createSupabaseRouteClient();
  const { catId } = await params;
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log(`[DELETE /api/cats/${catId}] Failed: Authentication error`);
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  console.log(`[DELETE /api/cats/${catId}] Attempting delete by user ${user.id}`);

  try {
    // 1. Find the cat and its household ID
    const cat = await prisma.cats.findUnique({
      where: { id: catId },
      select: { household_id: true }
    });

    if (!cat) {
      console.log(`[DELETE /api/cats/${catId}] Failed: Cat not found`);
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 });
    }
    
    const householdId = cat.household_id;
    if (!householdId) {
      console.error(`[DELETE /api/cats/${catId}] Failed: Cat ${catId} is not associated with any household.`);
      return NextResponse.json({ error: 'Cat has no associated household' }, { status: 500 });
    }

    // 2. Verify user membership in that household
    console.log(`[DELETE /api/cats/${catId}] Verifying user ${user.id} membership in household ${householdId}`);
    const userAccess = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: householdId
      }
    });

    if (!userAccess) {
      console.log(`[DELETE /api/cats/${catId}] Failed: User ${user.id} not member of household ${householdId}`);
      return NextResponse.json({ error: 'Access denied: User does not belong to this household' }, { status: 403 });
    }
    console.log(`[DELETE /api/cats/${catId}] User ${user.id} authorized for household ${householdId}`);

    // 3. Perform Deletion (within a transaction for atomicity)
    console.log(`[DELETE /api/cats/${catId}] Starting transaction to delete meals and cat`);
    await prisma.$transaction(async (tx) => {
      // Delete associated meals
      await tx.feeding_logs.deleteMany({
        where: { cat_id: catId }
      });
      console.log(`[DELETE /api/cats/${catId}] Associated meals deleted`);

      // Delete the cat
      await tx.cats.delete({
        where: { id: catId }
      });
      console.log(`[DELETE /api/cats/${catId}] Cat deleted successfully`);
    });
    console.log(`[DELETE /api/cats/${catId}] Transaction completed`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[DELETE /api/cats/${catId}] Error during delete process:`, error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the cat', details: (error instanceof Error) ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 