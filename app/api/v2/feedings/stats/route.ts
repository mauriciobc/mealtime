import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { withHybridAuth } from "@/lib/middleware/hybrid-auth";
import { MobileAuthUser } from "@/lib/middleware/mobile-auth";
import { logger } from "@/lib/monitoring/logger";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Validation schema for query parameters
const statsQuerySchema = z.object({
  catId: z.string().uuid({ message: "Invalid cat ID format" }).nullable().optional(),
  days: z.string().regex(/^\d+$/).transform(Number).pipe(
    z.number().int().positive().max(90)
  ).optional().default(7),
});

export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug('[GET /api/v2/feedings/stats] Request from user:', { userId: user.id });

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const validationResult = statsQuerySchema.safeParse({
      catId: searchParams.get("catId"),
      days: searchParams.get("days") || "7",
    });

    if (!validationResult.success) {
      logger.warn('[GET /api/v2/feedings/stats] Invalid query parameters:', { 
        validationError: validationResult.error.format() 
      });
      return NextResponse.json({
        success: false,
        error: "Invalid query parameters",
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { catId, days } = validationResult.data;

    // Validate user has a household
    if (!user.household_id) {
      logger.warn(`[GET /api/v2/feedings/stats] User ${user.id} has no household`);
      return NextResponse.json({
        success: false,
        error: 'User must belong to a household'
      }, { status: 403 });
    }

    // If catId is provided, validate it belongs to user's household BEFORE querying
    if (catId) {
      const cat = await prisma.cats.findUnique({
        where: { id: catId },
        select: { household_id: true }
      });
      
      if (!cat) {
        logger.warn(`[GET /api/v2/feedings/stats] Cat ${catId} not found`);
        return NextResponse.json({
          success: false,
          error: 'Cat not found'
        }, { status: 404 });
      }
      
      if (cat.household_id !== user.household_id) {
        logger.warn(`[GET /api/v2/feedings/stats] User ${user.id} not authorized for cat ${catId}`);
        return NextResponse.json({
          success: false,
          error: 'Access denied to this cat'
        }, { status: 403 });
      }
    }

    // Calculate the date range with UTC-normalized day boundaries
    // This ensures consistent behavior across timezones and includes full days
    const now = new Date();
    const utcNow = toZonedTime(now, 'UTC');
    
    // Start of day for (today - days) in UTC
    const utcStartOfPeriod = startOfDay(subDays(utcNow, days));
    const startDate = fromZonedTime(utcStartOfPeriod, 'UTC');
    
    // End of day for today in UTC (inclusive of the full day)
    const utcEndOfToday = endOfDay(utcNow);
    const endDate = fromZonedTime(utcEndOfToday, 'UTC');

    // Build the where clause with MANDATORY household authorization filter
    // Uses join to cats table to ensure only feedings for cats in user's household are returned
    const where: any = {
      fed_at: {
        gte: startDate,
        lte: endDate,
      },
      cat: {
        household_id: user.household_id // SECURITY: Always filter by user's household
      }
    };
    
    // Optionally filter by specific cat (already validated above)
    if (catId) {
      where.cat_id = catId;
    }

    // Get feeding data for the period
    // The join with cats table ensures household-level authorization
    const feedings = await prisma.feeding_logs.findMany({
      where,
      select: {
        id: true,
        meal_type: true,
        amount: true,
        fed_at: true,
        cat_id: true,
        cat: {
          select: {
            name: true,
          }
        }
      }
    });

    // Group by day and meal type
    // Note: Using 'amount' field to track actual food quantity, not just feeding count
    const dailyStats: Record<string, any> = {};
    const catStats: Record<string, any> = {};
    
    feedings.forEach(feeding => {
      const date = feeding.fed_at.toISOString().split('T')[0];
      if (!date) return;
      
      const catId = feeding.cat_id;
      const mealType = feeding.meal_type;
      // Convert Decimal to number, default to 1 if null
      const amount = feeding.amount ? Number(feeding.amount) : 1;
      
      // Initialize daily stats for this date if needed
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          total: 0,
          byType: {},
        };
      }
      
      // Initialize cat stats if needed
      if (!catStats[catId]) {
        catStats[catId] = {
          id: catId,
          name: feeding.cat?.name || "Unknown Cat",
          totalFeedings: 0,
          byType: {},
          dailyAverage: 0,
        };
      }
      
      // Update daily stats (using amount, not count)
      dailyStats[date].total += amount;
      if (!dailyStats[date].byType[mealType]) {
        dailyStats[date].byType[mealType] = 0;
      }
      dailyStats[date].byType[mealType] += amount;
      
      // Update cat stats (using amount, not count)
      catStats[catId].totalFeedings += amount;
      if (!catStats[catId].byType[mealType]) {
        catStats[catId].byType[mealType] = 0;
      }
      catStats[catId].byType[mealType] += amount;
    });
    
    // Calculate daily averages for each cat
    Object.keys(catStats).forEach(catId => {
      catStats[catId].dailyAverage = parseFloat((catStats[catId].totalFeedings / days).toFixed(2));
    });

    // Fill in missing dates in the range
    // Use counter-based loop to avoid DST issues and date mutation
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    
    // Normalize startDate and endDate to UTC date-only (midnight)
    const startUtc = Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    );
    const endUtc = Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    );
    
    // Calculate the number of days inclusive
    const daysInclusive = Math.floor((endUtc - startUtc) / MS_PER_DAY) + 1;
    
    const allDates: string[] = [];
    for (let i = 0; i < daysInclusive; i++) {
      // Create each date from startUtc without mutation
      const currentDate = new Date(startUtc + i * MS_PER_DAY);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // TypeScript guard: toISOString().split('T')[0] always returns a valid string
      if (!dateStr) continue;
      
      allDates.push(dateStr);
      
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = {
          date: dateStr,
          total: 0,
          byType: {},
        };
      }
    }

    // Calculate total amount across all feedings (convert Decimal to number)
    const totalAmount = feedings.reduce((sum, feeding) => {
      const amount = feeding.amount ? Number(feeding.amount) : 1;
      return sum + amount;
    }, 0);
    
    // Format the response
    const responseData = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      totals: {
        feedings: feedings.length, // Number of feeding events
        totalAmount, // Total food quantity across all feedings
        byType: {} as Record<string, number>,
        dailyAverage: parseFloat((totalAmount / days).toFixed(2)), // Average food quantity per day
      },
      dailyStats: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
      catStats: Object.values(catStats),
    };
    
    // Calculate totals by meal type (using amount, not count)
    feedings.forEach(feeding => {
      const mealType = feeding.meal_type;
      // Convert Decimal to number, default to 1 if null
      const amount = feeding.amount ? Number(feeding.amount) : 1;
      if (!responseData.totals.byType[mealType]) {
        responseData.totals.byType[mealType] = 0;
      }
      responseData.totals.byType[mealType] += amount;
    });

    logger.info(`[GET /api/v2/feedings/stats] Retrieved stats for user ${user.id}:`, {
      totalFeedings: feedings.length,
      days,
      catId: catId || 'all'
    });

    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    // Log full error details on server for debugging
    logger.error("[GET /api/v2/feedings/stats] Error fetching feeding statistics", { 
      error,
      userId: user.id,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return generic error to client, only include details in development
    const response: any = {
      success: false,
      error: "Failed to fetch feeding statistics"
    };
    
    // Only expose sanitized error details in non-production environments
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      // Sanitize error message to remove sensitive DB/schema details
      const sanitizedMessage = error.message
        .replace(/Prisma.*?:/gi, 'Database:')
        .replace(/prisma\.[a-z_]+/gi, 'table')
        .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID]')
        .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/gi, '[EMAIL]')
        .replace(/password[^\s]*/gi, '[REDACTED]')
        .replace(/token[^\s]*/gi, '[REDACTED]');
      
      response.details = sanitizedMessage;
    }
    
    return NextResponse.json(response, { status: 500 });
  }
});

