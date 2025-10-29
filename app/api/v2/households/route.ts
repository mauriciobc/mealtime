import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation Schemas
const createHouseholdSchema = z.object({
  name: z.string().min(1, 'Nome do domicílio é obrigatório'),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1),
});

// GET /api/v2/households - Get all households for the user
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  logger.info("[GET /api/v2/households] Starting request", {
    requestId,
    userId: user.id
  });

  try {
    // Parse and validate pagination parameters
    const { searchParams } = new URL(request.url);
    const paginationResult = paginationSchema.safeParse({
      limit: searchParams.get('limit') || '20',
      page: searchParams.get('page') || '1',
    });

    if (!paginationResult.success) {
      logger.error('[GET /api/v2/households] Pagination validation error', {
        requestId,
        issues: paginationResult.error.issues
      });
      return NextResponse.json({
        success: false,
        error: 'Parâmetros de paginação inválidos',
        details: paginationResult.error.issues
      }, { status: 400 });
    }

    const { limit, page } = paginationResult.data;
    const skip = (page - 1) * limit;

    logger.info("[GET /api/v2/households] Pagination params", {
      requestId,
      limit,
      page,
      skip
    });

    // Fetch households the user is a member of using Prisma profile ID
    const userWithHouseholds = await prisma.profiles.findUnique({
      where: {
        id: user.id
      },
      select: {
        household_members: {
          skip,
          take: limit,
          select: {
            household: {
              include: {
                household_members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        full_name: true,
                        email: true,
                      }
                    }
                  }
                }
              }
            },
            role: true,
          },
        },
      },
    });

    if (!userWithHouseholds) {
      logger.warn(`[GET /api/v2/households] Prisma profile not found for auth ID: ${user.id}`);
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Get total count for pagination metadata
    const totalCount = await prisma.household_members.count({
      where: { user_id: user.id }
    });
    
    const households = userWithHouseholds.household_members.map(member => {
      const household = member.household;
      
      // Filter out members with null user to avoid runtime errors
      const validMembers = household.household_members.filter(m => m.user !== null);
      
      // Find the owner info from members list (with null check)
      const ownerMember = validMembers.find(m => m.user?.id === household.owner_id);
      
      return {
        ...household,
        // Add owner property mapped from owner_id
        owner: ownerMember?.user ? {
          id: ownerMember.user.id,
          name: ownerMember.user.full_name || 'Usuário sem nome',
          email: ownerMember.user.email || ''
        } : undefined,
        // Only map members with valid user data
        members: validMembers.map(m => ({
          id: m.id,
          userId: m.user!.id, // Safe because we filtered null users
          name: m.user!.full_name || 'Usuário sem nome',
          email: m.user!.email || '',
          role: m.role,
          joinedAt: m.created_at
        }))
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    logger.info(`[GET /api/v2/households] Found ${households.length} households`, {
      requestId,
      count: households.length,
      page,
      totalPages
    });

    return NextResponse.json({
      success: true,
      data: households,
      count: households.length,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error: any) {
    logger.error('[GET /api/v2/households] Error:', {
      requestId,
      error,
      message: error?.message
    });
    
    // Check for specific Prisma errors relevant to read operations
    if (error?.code === 'P2021') {
      return NextResponse.json({
        success: false,
        error: 'Tabela não encontrada. Verifique se as migrações foram aplicadas.'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar domicílios'
    }, { status: 500 });
  }
});

// POST /api/v2/households - Create a new household
export const POST = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  logger.info("[POST /api/v2/households] Starting request", {
    requestId,
    userId: user.id
  });

  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = createHouseholdSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('[POST /api/v2/households] Validation Error:', {
        requestId,
        issues: validationResult.error.issues
      });
      return NextResponse.json({
        success: false,
        error: validationResult.error.issues[0]?.message || 'Validation error',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    const { name } = validationResult.data;

    // Create household and add current user as admin
    const household = await prisma.$transaction(async (tx) => {
      const newHousehold = await tx.households.create({
        data: {
          name,
          owner_id: user.id,
          household_members: {
            create: {
              user_id: user.id,
              role: 'admin',
            },
          },
        },
        include: {
          household_members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  full_name: true,
                },
              },
            },
          },
        },
      });

      // Find the owner info from the members list
      const ownerMember = newHousehold.household_members.find(
        m => m.user_id === newHousehold.owner_id
      );
      
      return {
        id: newHousehold.id,
        name: newHousehold.name,
        created_at: newHousehold.created_at,
        updated_at: newHousehold.updated_at,
        owner_id: newHousehold.owner_id,
        // Add owner property for frontend consistency
        owner: ownerMember ? {
          id: ownerMember.user_id,
          name: ownerMember.user.full_name || '',
          email: ownerMember.user.email || ''
        } : undefined,
        members: newHousehold.household_members.map((member) => ({
          id: member.id,
          userId: member.user_id,
          name: member.user.full_name || '',
          email: member.user.email || '',
          role: member.role,
          joinedAt: member.created_at,
        })),
      };
    });

    logger.info('[POST /api/v2/households] Success: Created household', {
      requestId,
      householdId: household.id
    });
    
    return NextResponse.json({
      success: true,
      data: household
    }, { status: 201 });
  } catch (error: any) {
    logger.error('[POST /api/v2/households] Server Error:', {
      requestId,
      error,
      message: error?.message
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
});

