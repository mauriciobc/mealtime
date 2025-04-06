import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Schema for validating the request body when adding a weight measurement
const weightMeasurementSchema = z.object({
  weight: z.number().positive('Weight must be a positive number'),
  unit: z.string().optional().default('kg'), // Default unit, can be overridden
  measuredAt: z.coerce.date().optional(), // Coerce string/number to Date if provided
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id; // Assuming user ID is stored as number in session/db

    const catIdInt = parseInt(params.id, 10);
    if (isNaN(catIdInt)) {
      return NextResponse.json({ error: 'Invalid Cat ID' }, { status: 400 });
    }

    // Validate input body
    const body = await request.json();
    const parseResult = weightMeasurementSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    const { weight, unit, measuredAt } = parseResult.data;

    // --- Authorization Check ---
    // Fetch the cat and verify ownership/household membership
    const cat = await prisma.cat.findUnique({
      where: { id: catIdInt },
      select: { householdId: true, userId: true }, // Select only needed fields
    });

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 });
    }

    // Basic check: Is the user the direct owner?
    // More robust check: Does the user belong to the cat's household?
    // Assuming user object in session has householdId or needs fetching
    // For simplicity now, we check direct ownership. Replace with household check if needed.
    // const user = await prisma.user.findUnique({ where: { id: userId }, select: { householdId: true } });
    // if (!user || user.householdId !== cat.householdId) {
    if (cat.userId !== userId) { // Simple owner check for now
      console.warn(`User ${userId} attempted to add weight for cat ${catIdInt} they don't own.`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // --- End Authorization Check ---

    // Use a transaction to ensure both creation and update succeed or fail together
    const newMeasurement = await prisma.$transaction(async (tx) => {
      const createdMeasurement = await tx.weightMeasurement.create({
        data: {
          catId: catIdInt,
          weight: weight,
          unit: unit,
          measuredAt: measuredAt, // Will use default (now()) if undefined
          // Assuming Prisma client handles createdAt/updatedAt automatically
        },
      });

      // Update the Cat's latest weight
      await tx.cat.update({
        where: { id: catIdInt },
        data: { weight: weight }, // Update the latest weight field on the Cat
      });

      return createdMeasurement;
    });


    return NextResponse.json(newMeasurement, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('Error creating weight measurement:', error);
    // Add more specific error handling (e.g., Prisma validation errors)
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation Error', details: error.format() }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// --- GET Handler ---
export async function GET(
  request: Request, // Added type annotation
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
    // Fetch the cat to verify ownership/household membership
    const cat = await prisma.cat.findUnique({
      where: { id: catIdInt },
      select: { householdId: true, userId: true }, // Select only needed fields
    });

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 });
    }

    // Basic check: Is the user the direct owner?
    // TODO: Implement proper household check later if needed
    if (cat.userId !== userId) { // Simple owner check for now
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // --- End Authorization Check ---

    // Fetch weight measurements, ordered by date (newest first)
    const measurements = await prisma.weightMeasurement.findMany({
      where: {
        catId: catIdInt,
      },
      orderBy: {
        measuredAt: 'desc', // Show most recent measurements first
      },
    });

    return NextResponse.json(measurements);

  } catch (error) {
    console.error('Error fetching weight measurements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 