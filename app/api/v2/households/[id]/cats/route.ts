import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BaseCats } from "@/lib/types/common";
import { z } from "zod";
import { logger } from "@/lib/monitoring/logger";
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Zod schema for POST request body
const PostBodySchema = z.object({
  name: z.string().trim().min(1),
  photoUrl: z.string().url().nullable().optional(),
  birthdate: z.string().datetime().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  restrictions: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  feedingInterval: z.number().int().min(1).max(24).optional(),
  portion_size: z.number().positive().optional(),
}).strict();

// GET /api/v2/households/[id]/cats - Listar gatos de um domicílio
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[GET /api/v2/households/[id]/cats] Missing context.params from framework", {
      requestId,
      userId: user.id,
      url: request.url
    });
    return NextResponse.json({
      success: false,
      error: "Internal routing error: missing route parameters"
    }, { status: 500 });
  }

  const params = await context.params;
  const householdId = params.id;

  logger.info("[GET /api/v2/households/[id]/cats] Starting request", {
    requestId,
    householdId,
    userId: user.id
  });

  if (!householdId || typeof householdId !== 'string' || householdId.length === 0) {
    logger.error(`[GET /api/v2/households/cats] Invalid or missing householdId`, { householdId });
    return NextResponse.json({
      success: false,
      error: "ID do domicílio inválido ou ausente"
    }, { status: 400 });
  }

  try {
    // Verify user has access to this household
    const membership = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: householdId
      }
    });

    if (!membership) {
      logger.warn("[GET /api/v2/households/[id]/cats] User not authorized for household", {
        requestId,
        userId: user.id,
        householdId,
      });
      return NextResponse.json({
        success: false,
        error: "Not authorized to access this household"
      }, { status: 403 });
    }

    // Fetch cats for the household
    const cats = await prisma.cats.findMany({
      where: {
        household_id: householdId
      },
      select: {
        id: true,
        name: true,
        photo_url: true,
        birth_date: true,
        weight: true,
        household_id: true,
        owner_id: true,
        portion_size: true,
        created_at: true,
        updated_at: true,
        restrictions: true,
        notes: true,
        feeding_interval: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform the response to handle Decimal fields
    const transformedCats = cats.map(cat => ({
      ...cat,
      weight: cat.weight ? cat.weight.toNumber() : null,
      portion_size: cat.portion_size ? cat.portion_size.toNumber() : null
    }));

    logger.info("[GET /api/v2/households/[id]/cats] Successfully fetched cats", {
      requestId,
      count: cats.length,
    });

    return NextResponse.json({
      success: true,
      data: transformedCats,
      count: transformedCats.length
    });
  } catch (error) {
    logger.error("[GET /api/v2/households/[id]/cats] Unexpected error", {
      requestId,
      error,
    });
    
    // Check for Prisma connection errors (P1001, P1002, P1003, etc.)
    if ((error as any)?.code?.startsWith('P1')) {
      return NextResponse.json({
        success: false,
        error: "Database connection error"
      }, { status: 503 });
    }
    
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
});

// POST /api/v2/households/[id]/cats - Adicionar gato ao domicílio
export const POST = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[POST /api/v2/households/[id]/cats] Missing context.params from framework", {
      userId: user.id,
      url: request.url
    });
    return NextResponse.json({
      success: false,
      error: "Internal routing error: missing route parameters"
    }, { status: 500 });
  }

  const params = await context.params;
  const householdId = params.id;

  logger.debug(`[POST /api/v2/households/${householdId}/cats] Using householdId: ${householdId}`);

  if (!householdId || typeof householdId !== 'string' || householdId.length === 0) {
    logger.error(`[POST /api/v2/households/cats] Invalid or missing householdId`, { householdId });
    return NextResponse.json({
      success: false,
      error: "ID do domicílio inválido ou ausente"
    }, { status: 400 });
  }

  try {
    // Verify user has access to this household
    const membership = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: householdId
      }
    });

    if (!membership) {
      logger.warn(`[POST /api/v2/households/${householdId}/cats] User ${user.id} not authorized`);
      return NextResponse.json({
        success: false,
        error: "Not authorized to access this household"
      }, { status: 403 });
    }

    const body = await request.json();
    const bodyValidation = PostBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      logger.error(`[POST /api/v2/households/${householdId}/cats] Invalid body`, { issues: bodyValidation.error.issues });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: bodyValidation.error.issues
      }, { status: 400 });
    }

    const data = bodyValidation.data;
    logger.debug(`[POST /api/v2/households/${householdId}/cats] Creating cat with data:`, data);

    const cat = await prisma.cats.create({
      data: {
        name: data.name,
        photo_url: data.photoUrl ?? null,
        birth_date: data.birthdate ? new Date(data.birthdate) : null,
        weight: data.weight ?? null,
        household_id: householdId,
        owner_id: user.id,
        restrictions: data.restrictions ?? null,
        notes: data.notes ?? null,
        feeding_interval: data.feedingInterval ?? null,
        portion_size: data.portion_size ?? null
      }
    });
    
    logger.info(`[POST /api/v2/households/${householdId}/cats] Cat created successfully with ID: ${cat.id}`);

    // Format output to match BaseCats
    const formattedCat: BaseCats = {
      id: cat.id,
      created_at: cat.created_at,
      updated_at: cat.updated_at,
      name: cat.name,
      photo_url: cat.photo_url,
      birth_date: cat.birth_date,
      weight: cat.weight?.toNumber() ?? null,
      household_id: cat.household_id,
      owner_id: cat.owner_id,
      restrictions: cat.restrictions,
      notes: cat.notes,
      feeding_interval: cat.feeding_interval,
      portion_size: cat.portion_size?.toNumber() ?? null
    };

    return NextResponse.json({
      success: true,
      data: formattedCat
    }, { status: 201 });
  } catch (error) {
    logger.error(`[POST /api/v2/households/${householdId}/cats] Error creating cat`, { error });
    
    if (error instanceof Error && error.message.includes('connect')) {
      return NextResponse.json({
        success: false,
        error: 'Database connection error'
      }, { status: 503 });
    }
    
    if ((error as any).code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: 'Erro: Conflito ao criar gato (ex: nome duplicado?)'
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao criar o gato'
    }, { status: 500 });
  }
});

