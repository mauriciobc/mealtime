import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications'; // Assuming this exists and works

// Define the reminder threshold (e.g., 14 days)
const REMINDER_THRESHOLD_DAYS = 14;

// Expected secret passed via Authorization header (Bearer <secret>)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // --- Security Check ---
  if (!CRON_SECRET) {
    console.error('CRON_SECRET environment variable is not set. Cannot run reminder job.');
    // Don't reveal the absence of the secret in the response for security
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('Unauthorized attempt to access cron job.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // --- End Security Check ---

  console.log('Running Send Weight Reminders Cron Job...');
  let notificationsSent = 0;
  let usersNotified: Set<number> = new Set();

  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - REMINDER_THRESHOLD_DAYS);

    // 1. Find all cats
    // Optimization: Could fetch cats with their latest measurement in one go if needed,
    // but simpler to fetch all cats first, then query measurements.
    const cats = await prisma.cat.findMany({
      select: {
        id: true,
        name: true,
        userId: true, // Need the owner's ID
        weightMeasurements: { // Get the latest measurement only
          orderBy: { measuredAt: 'desc' },
          take: 1,
          select: { measuredAt: true },
        },
      },
    });

    // 2. Determine which cats need reminders
    const catsNeedingReminder = cats.filter(cat => {
        if (cat.weightMeasurements.length === 0) {
            return true; // Never weighed
        }
        const lastMeasured = new Date(cat.weightMeasurements[0].measuredAt);
        return lastMeasured < thresholdDate; // Weighed too long ago
    });

    if (catsNeedingReminder.length === 0) {
        console.log('No cats require weight reminders.');
        return NextResponse.json({ message: 'No reminders needed.' });
    }

    console.log(`Found ${catsNeedingReminder.length} cats needing reminders.`);

    // 3. Group users to notify
    const usersToNotify: { [userId: number]: string[] } = {}; // userId -> [cat names]
    catsNeedingReminder.forEach(cat => {
        if (!usersToNotify[cat.userId]) {
            usersToNotify[cat.userId] = [];
        }
        usersToNotify[cat.userId].push(cat.name);
    });

    // 4. Send notifications
    for (const userIdStr in usersToNotify) {
      const userId = parseInt(userIdStr, 10);
      const catNames = usersToNotify[userId];

      // Avoid sending multiple notifications to the same user within this job run
      if (usersNotified.has(userId)) {
          continue;
      }

      // Customize notification message
      let title = 'Weight Reminder';
      let body = `Time to weigh your cat!`;
      if (catNames.length === 1) {
          body = `It's time to record ${catNames[0]}'s weight.`;
      } else if (catNames.length > 1) {
          body = `It's time to record weights for ${catNames.slice(0, 2).join(' and ')}`;
          if (catNames.length > 2) body += ` and ${catNames.length - 2} other(s).`;
      }

      try {
        // Note: sendNotification likely needs adaptation if it expects integer IDs from session
        // Here we pass the integer ID directly.
        await sendNotification(userId.toString(), { // Assuming sendNotification expects string ID
          title: title,
          body: body,
          // Optional: Add a generic deep link if possible, or omit
          // data: { url: '/dashboard' } // Generic link
        });
        notificationsSent++;
        usersNotified.add(userId);
        console.log(`Sent notification to user ${userId} for cats: ${catNames.join(', ')}`);
      } catch (sendError) {
        console.error(`Failed to send notification to user ${userId}:`, sendError);
        // Continue trying other users
      }
    }

    console.log(`Finished cron job. Sent ${notificationsSent} notifications.`);
    return NextResponse.json({ message: `Reminder job complete. Sent ${notificationsSent} notifications.` });

  } catch (error) {
    console.error('Error in send-weight-reminders cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 