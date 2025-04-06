import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextApiRequest } from 'next'; // Import for type hinting searchParams
import { URLSearchParams } from 'url'; // To parse query parameters

/**
 * @swagger
 * /api/cats/{id}/feeding:
 *   get:
 *     summary: Get feeding logs for a specific cat
 *     description: Retrieves feeding logs for a specific cat, optionally filtering by a start date.
 *     tags:
 *       - Cats
 *       - Feeding
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the cat.
 *       - in: query
 *         name: since
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Optional ISO 8601 timestamp to filter logs recorded *after* or *at* this time.
 *     responses:
 *       200:
 *         description: Feeding logs retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FeedingLog' # Assuming a schema definition exists
 *       400:
 *         description: Invalid Cat ID or invalid 'since' date format.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
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

    // --- Authorization Check ---
    const cat = await prisma.cat.findUnique({
      where: { id: catIdInt },
      select: { userId: true },
    });

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 });
    }

    if (cat.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // --- End Authorization Check ---

    // --- Filtering Logic ---
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get('since');
    let sinceDate: Date | undefined = undefined;

    if (sinceParam) {
        sinceDate = new Date(sinceParam);
        if (isNaN(sinceDate.getTime())) {
             return NextResponse.json({ error: "Invalid 'since' date format. Please use ISO 8601 format." }, { status: 400 });
        }
    }

    // --- Database Query ---
    const feedingLogs = await prisma.feedingLog.findMany({
      where: {
        catId: catIdInt,
        ...(sinceDate && { timestamp: { gte: sinceDate } })
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return NextResponse.json(feedingLogs);

  } catch (error) {
    console.error(`Error fetching feeding logs for cat ${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// TODO: Add POST handler for creating feeding logs if it doesn't exist elsewhere 