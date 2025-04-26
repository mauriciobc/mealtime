import { NextRequest, NextResponse } from 'next/server';
// Use the shared Prisma client
import prisma from '@/lib/prisma';
import { withModel } from '@/lib/prisma/safe-access';
// Add top-level logging
console.log(`[API /feedings] Module loaded. typeof prisma: ${typeof prisma}. Keys:`, prisma ? Object.keys(prisma) : 'prisma is null/undefined');
console.log(`[API /feedings] DATABASE_URL set: ${!!process.env.DATABASE_URL}`); // Check if DB URL env var exists
// Remove direct PrismaClient import
// import { PrismaClient } from '@prisma/client';
import { BaseFeedingLog } from '@/lib/types/common';
import { FeedingLog } from '@/lib/types';
// Remove unused Supabase SSR imports related to client creation
// import { ReadonlyRequestCookies, RequestCookies } from 'next/dist/server/web/spec-extension/cookies'; // Import types
// import { createServerClient, type CookieOptions } from '@supabase/ssr';
// import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { z } from "zod";

// Log Runtime
console.log('[/api/feedings] Runtime:', process.env.NEXT_RUNTIME);

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Remove direct instantiation
// const prisma = new PrismaClient();

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Interface for where clause in queries
interface WhereClause {
  cat_id?: number; // Updated to match schema
  // Remove cat property as we'll query directly
}

// Define validation schema for POST request body
// Remove userId from schema, it will come from header
const createFeedingSchema = z.object({
  catId: z.string().uuid({ message: "Invalid cat ID format" }),
  // meal_type: z.enum(["dry", "wet", "treat", "medicine", "water"], { // Allow any type for now if sent via Feed Now
  //   errorMap: () => ({ message: "Invalid meal type" }),
  // }).optional(), // Make optional for Feed Now
  amount: z.number().positive().nullable().optional(), // Allow optional amount
  notes: z.string().max(255).optional(), // Allow optional notes
});

// Define validation schema for GET request query parameters
const getFeedingsQuerySchema = z.object({
  catId: z.string().uuid({ message: "Invalid cat ID format" }).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(
    z.number().int().positive().max(100)
  ).optional().default("20"),
  skip: z.string().regex(/^\d+$/).transform(Number).pipe(
    z.number().int().nonnegative()
  ).optional(),
});

// GET /api/feedings - Listar registros de alimentação
export async function GET(request: NextRequest) {
  const headersList = await headers();
  const authUserId = headersList.get('X-User-ID');

  if (!authUserId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Get householdId from query params
  const { searchParams } = new URL(request.url);
  console.log('[GET /api/feedings] Request URL:', request.url);
  console.log('[GET /api/feedings] Search params:', Object.fromEntries(searchParams.entries()));
  const householdId = searchParams.get('householdId');

  if (!householdId) {
    console.log('[GET /api/feedings] Missing householdId parameter');
    return NextResponse.json({ error: 'Household ID is required' }, { status: 400 });
  }

  // 1. Verify user has access to this household
  try {
    const userAccess = await prisma.household_members.findFirst({
      where: {
        household_id: householdId,
        user_id: authUserId
      }
    });

    if (!userAccess) {
      console.log(`[GET /api/feedings] User ${authUserId} denied access to household ${householdId}`);
      return NextResponse.json({ error: 'Access denied to this household' }, { status: 403 });
    }
    console.log(`[GET /api/feedings] User ${authUserId} granted access to household ${householdId}`);
  } catch (error) {
    console.error(`[GET /api/feedings] Error verifying household access for user ${authUserId} and household ${householdId}:`, error);
    return NextResponse.json(
      { error: 'Failed to verify household access', details: (error instanceof Error) ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }

  // 2. Get all meals (feedings) for the household's cats
  try {
    const feedings = await prisma.feeding_logs.findMany({
      where: {
        household_id: householdId
      },
      include: {
        feeder: {
          select: {
            id: true, // Include feeder ID
            full_name: true,
            avatar_url: true
          }
        }
      },
      orderBy: {
        fed_at: 'desc'
      },
      take: 50 // Limit to last 50 feedings
    });
    console.log(`[GET /api/feedings] Found ${feedings.length} feedings for household ${householdId}`);
    return NextResponse.json(feedings);
    
  } catch (error) {
    console.error(`[GET /api/feedings] Error fetching feedings for household ${householdId}:`, error);
    // Provide more specific error details if possible
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown database error';
    // Check for specific Prisma errors if needed
    // if (error instanceof Prisma.PrismaClientKnownRequestError) { ... }
    return NextResponse.json(
      { error: 'Failed to fetch feeding data', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/feedings - Criar um novo registro de alimentação
export async function POST(request: NextRequest) {
  const headersList = await headers();
  const authUserId = headersList.get('X-User-ID');

  if (!authUserId) {
    console.log("[POST /api/feedings] Failed: Missing X-User-ID header");
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log("[POST /api/feedings] Received body:", body);

    // Validate the request body against schema (userId removed)
    const validationResult = createFeedingSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("[POST /api/feedings] Invalid body:", validationResult.error.format());
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { catId, amount, notes } = validationResult.data;
    const mealType = body.meal_type || "manual"; // Default to 'manual' if not provided (e.g., Feed Now)

    // --- Authorization & Validation --- 
    // Fetch cat and user profile in parallel to verify ownership and get householdId
    console.log(`[POST /api/feedings] Verifying access for user ${authUserId} and cat ${catId}`);
    const [cat, userProfile] = await Promise.all([
        prisma.cats.findUnique({ where: { id: catId }, select: { household_id: true } }),
        // Fetch householdId directly from household_members table using user_id
        prisma.household_members.findFirst({ 
            where: { user_id: authUserId }, 
            select: { household_id: true } 
        })
    ]);

    const userHouseholdId = userProfile?.household_id; // Get householdId from the join table result

    if (!cat) {
        console.log(`[POST /api/feedings] Cat not found: ${catId}`);
        return NextResponse.json({ error: 'Cat not found' }, { status: 404 });
    }
    if (!userHouseholdId) {
        console.log(`[POST /api/feedings] User ${authUserId} not associated with any household.`);
        // This case implies the user exists in auth but maybe not profiles/household_members
        return NextResponse.json({ error: 'User household not found' }, { status: 403 }); 
    }
    if (cat.household_id !== userHouseholdId) {
        console.log(`[POST /api/feedings] Access Denied: Cat ${catId} (household ${cat.household_id}) does not belong to user ${authUserId} (household ${userHouseholdId})`);
        return NextResponse.json({ error: 'Access denied: Cat does not belong to user\'s household' }, { status: 403 });
    }
    console.log(`[POST /api/feedings] Access granted for user ${authUserId} to cat ${catId} in household ${userHouseholdId}`);
    // --- End Authorization & Validation --- 

    // Create the feeding record using derived IDs
    console.log(`[POST /api/feedings] Creating feeding log...`);
    const feedingLog = await prisma.feeding_logs.create({
      data: {
        cat_id: catId,
        meal_type: mealType, 
        amount: amount, // Use validated amount
        notes: notes, // Use validated notes
        fed_by: authUserId, // Use ID from header
        household_id: userHouseholdId, // Use derived household ID
        fed_at: new Date(), // Use current timestamp for feeding time
      },
      include: { // Include feeder details for the response, matching GET
        feeder: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true
          }
        }
      }
    });
    console.log(`[POST /api/feedings] Feeding log created successfully: ${feedingLog.id}`);

    // Return the created record in the format expected by the context
    // (Matches GET response structure for consistency)
    return NextResponse.json(feedingLog, { status: 201 }); 

  } catch (error) {
    console.error("[POST /api/feedings] Error creating feeding log:", error);
    return NextResponse.json(
      { error: "Failed to create feeding log", details: (error instanceof Error) ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 