import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Schema for validating the request body when setting a weight goal
const weightGoalSchema = z.object({
  // Allow positive number or null (to clear the goal)
  weightGoal: z.number().positive('Goal must be a positive number').nullable(),
});

// Handler to SET/UPDATE the weight goal for a cat
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const catIdInt = parseInt(params.id, 10);
    if (isNaN(catIdInt)) {
      return NextResponse.json({ error: 'Invalid Cat ID' }, { status: 400 });
    }

    // Validate input body
    const body = await request.json();
    const parseResult = weightGoalSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    const { weightGoal } = parseResult.data;

    // --- Authorization Check ---
    const cat = await prisma.cat.findUnique({
      where: { id: catIdInt },
      select: { userId: true }, // Only need owner ID for this check
    });

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 });
    }

    // Basic owner check (replace with household check if needed)
    if (cat.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // --- End Authorization Check ---

    // Update the cat's weight goal
    const updatedCat = await prisma.cat.update({
      where: { id: catIdInt },
      data: { weightGoal: weightGoal }, // Set goal to value or null
      select: { id: true, weightGoal: true }, // Return only relevant fields
    });

    return NextResponse.json(updatedCat);

  } catch (error) {
    console.error('Error updating weight goal:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.format() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler to GET the current weight goal for a cat
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const catIdInt = parseInt(params.id, 10);
    if (isNaN(catIdInt)) {
      return NextResponse.json({ error: 'Invalid Cat ID' }, { status: 400 });
    }

    // --- Authorization Check ---
    const cat = await prisma.cat.findUnique({
      where: { id: catIdInt },
      select: { userId: true, weightGoal: true }, // Select owner and goal
    });

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 });
    }

    // Basic owner check (replace with household check if needed)
    if (cat.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // --- End Authorization Check ---

    // Return only the weight goal
    return NextResponse.json({ weightGoal: cat.weightGoal });

  } catch (error) {
    console.error('Error fetching weight goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 