import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * @swagger
 * /api/cats/{id}/basic-info:
 *   get:
 *     summary: Get basic information for a specific cat
 *     description: Retrieves the name and current weight for a specific cat, performing authorization checks.
 *     tags:
 *       - Cats
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the cat.
 *     responses:
 *       200:
 *         description: Basic cat information retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 currentWeight:
 *                   type: number
 *                   nullable: true
 *                 weightUnit:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Invalid Cat ID.
 *       401:
 *         description: Unauthorized (user not logged in).
 *       403:
 *         description: Forbidden (user does not have permission to view this cat).
 *       404:
 *         description: Cat not found.
 *       500:
 *         description: Internal server error.
 */
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

    // Fetch the cat to get the name and perform authorization
    const cat = await prisma.cat.findUnique({
      where: { id: catIdInt },
      select: {
        id: true,
        name: true,
        userId: true, // For authorization check
        birthdate: true,
        portion_size: true,
        // householdId: true, // Include if switching to household check
      },
    });

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 });
    }

    // --- Authorization Check (replace with proper household check eventually) ---
    if (cat.userId !== userId) { // Simple owner check for now
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // --- End Authorization Check ---

    // Fetch the latest weight measurement
    const latestMeasurement = await prisma.weightMeasurement.findFirst({
        where: { catId: catIdInt },
        orderBy: { measuredAt: 'desc' }
    });

    return NextResponse.json({
        id: cat.id,
        name: cat.name,
        currentWeight: latestMeasurement?.weight ?? null,
        weightUnit: latestMeasurement?.unit ?? null,
        birthdate: cat.birthdate,
        portion_size: cat.portion_size ?? null
    });

  } catch (error) {
    console.error(`Error fetching basic info for cat ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 