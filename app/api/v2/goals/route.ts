import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { Prisma } from '@prisma/client';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { sanitizeError, sanitizeDatabaseError } from '@/lib/utils/error-sanitizer';

interface NewGoalData {
  cat_id: string;
  goal_name: string;
  start_date: string;
  target_date: string;
  initial_weight: number;
  target_weight: number;
  unit: 'kg' | 'lbs';
  description?: string;
}

export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug(`[GET /api/v2/goals] Authenticated User ID: ${user.id}`);

    try {
      const goals = await prisma.weight_goals.findMany({
        where: {
          cat: {
            owner_id: user.id
          }
        },
        include: {
          milestones: true,
          cat: {
            select: {
              id: true,
              name: true,
              photo_url: true
            }
          }
        },
        orderBy: {
          target_date: 'desc',
        },
      });

      logger.info(`[GET /api/v2/goals] Found ${goals.length} goals for user ${user.id}`);
      
      return NextResponse.json({
        success: true,
        data: goals,
        count: goals.length
      });

    } catch (error: any) {
      logger.logError(error, { 
        message: 'Error fetching weight goals', 
        userId: user.id, 
        requestUrl: request.nextUrl.toString() 
      });
      
      const sanitized = sanitizeDatabaseError(error, 'fetch weight goals');
      return NextResponse.json(sanitized, { status: 500 });
    }
  } catch (err: any) {
    logger.error('[GET /api/v2/goals] Unhandled Exception', { err });
    
    const sanitized = sanitizeError(err, 'Internal server error');
    return NextResponse.json(sanitized, { status: 500 });
  }
});

export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug(`[POST /api/v2/goals] Request from user: ${user.id}`);

    try {
      const body = await request.json();
      const {
        cat_id,
        goal_name,
        start_date,
        target_date,
        initial_weight,
        target_weight,
        unit,
        description,
      } = body as NewGoalData;

      // Basic Validation
      if (!cat_id || !goal_name || !start_date || !target_date || initial_weight === undefined || target_weight === undefined || !unit) {
        return NextResponse.json({
          success: false,
          error: 'Missing required goal fields'
        }, { status: 400 });
      }
      
      if (typeof initial_weight !== 'number' || typeof target_weight !== 'number' || initial_weight <= 0 || target_weight <= 0) {
        return NextResponse.json({
          success: false,
          error: 'Weights must be positive numbers'
        }, { status: 400 });
      }
      
      // Parse and validate dates
      const sd = new Date(start_date);
      const td = new Date(target_date);
      
      // Check if start_date is valid
      if (isNaN(sd.getTime())) {
        return NextResponse.json({
          success: false,
          error: 'Invalid start_date format. Please provide a valid date string.'
        }, { status: 400 });
      }
      
      // Check if target_date is valid
      if (isNaN(td.getTime())) {
        return NextResponse.json({
          success: false,
          error: 'Invalid target_date format. Please provide a valid date string.'
        }, { status: 400 });
      }
      
      // Now safely compare the dates
      if (td <= sd) {
        return NextResponse.json({
          success: false,
          error: 'Target date must be after start date'
        }, { status: 400 });
      }
      
      if (!['kg', 'lbs'].includes(unit)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid unit. Must be kg or lbs'
        }, { status: 400 });
      }

      // Verify user has access to the cat
      const cat = await prisma.cats.findUnique({
        where: { id: cat_id },
        select: { owner_id: true, household_id: true }
      });

      if (!cat) {
        return NextResponse.json({
          success: false,
          error: 'Cat not found'
        }, { status: 404 });
      }

      // Verify ownership
      if (cat.owner_id !== user.id) {
        logger.warn(`[POST /api/v2/goals] User ${user.id} not owner of cat ${cat_id}`);
        return NextResponse.json({
          success: false,
          error: 'Access denied: You are not the owner of this cat'
        }, { status: 403 });
      }

      // Create the goal
      const data: Prisma.weight_goalsCreateInput = {
        goal_name,
        target_weight: new Prisma.Decimal(target_weight),
        target_date: target_date ? new Date(target_date) : null,
        start_weight: initial_weight ? new Prisma.Decimal(initial_weight) : null,
        unit,
        status: "active",
        notes: description || null,
        cat: { connect: { id: cat_id } },
        createdBy: { connect: { id: user.id } }
      };

      const newGoal = await prisma.weight_goals.create({
        data,
        include: {
          milestones: true,
          cat: {
            select: {
              id: true,
              name: true,
              photo_url: true
            }
          }
        }
      });

      logger.info(`[POST /api/v2/goals] Goal created successfully:`, { goalId: newGoal.id, catId: cat_id });

      return NextResponse.json({
        success: true,
        data: newGoal
      }, { status: 201 });

    } catch (error) {
      logger.error('[POST /api/v2/goals] Error', { error });
      
      if (error instanceof SyntaxError) {
        const sanitized = sanitizeError(error, 'Invalid request body');
        return NextResponse.json(sanitized, { status: 400 });
      }
      
      const sanitized = sanitizeDatabaseError(error, 'create goal');
      return NextResponse.json(sanitized, { status: 500 });
    }
  } catch (err: any) {
    logger.error('[POST /api/v2/goals] Unhandled Exception', { err });
    
    const sanitized = sanitizeError(err, 'Internal server error');
    return NextResponse.json(sanitized, { status: 500 });
  }
});

