import { NextRequest, NextResponse } from 'next/server';
import { getCats } from '@/lib/services/apiService';
import { getNextFeedingTime, getLastFeeding } from '@/lib/services/api-feeding-service';
import { generateFeedingNotifications } from '@/lib/services/feeding-notification-service';
import { createNotification } from '@/lib/services/notificationService';
import { differenceInMinutes, isAfter } from 'date-fns';

// Simple in-memory metrics (replace with persistent/Prometheus in prod)
const feedingNotificationMonitor = {
  checks: 0,
  successes: 0,
  failures: 0,
  lastDurationMs: 0,
  lastError: null as null | string,
};

export async function GET(req: NextRequest) {
  const start = Date.now();
  feedingNotificationMonitor.checks++;
  let notificationsCreated = 0;
  try {
    // 1. Fetch all cats
    const cats = await getCats();
    // 2. For each cat, fetch next feeding time and last feeding log
    for (const cat of cats) {
      const nextFeedingTime = await getNextFeedingTime(cat.id);
      if (!nextFeedingTime) continue;
      const lastFeedingLog = await getLastFeeding(cat.id);
      const lastFeedingTime = lastFeedingLog ? new Date(lastFeedingLog.timestamp) : null;
      const now = new Date();
      // If overdue, send repeated reminders every 15 minutes
      if (isAfter(now, nextFeedingTime)) {
        const minutesLate = differenceInMinutes(now, nextFeedingTime);
        const reminderInterval = Math.floor(minutesLate / 15); // 0-based
        // Check if a notification for this interval already exists
        // We'll fetch the user's notifications and filter in-memory (could be optimized with a direct query if needed)
        // For system-cron, we may not have a user context, so skip user check
        // Instead, use catId + scheduledTime + reminderInterval as unique key
        // Fetch recent notifications for this cat and scheduled time
        const page = 1, limit = 20;
        const { data: recentNotifications } = await import('@/lib/services/notificationService').then(m => m.getUserNotifications(page, limit));
        const alreadySent = recentNotifications.some(n =>
          n.type === 'reminder' &&
          n.metadata &&
          n.metadata.catId === String(cat.id) &&
          n.metadata.scheduledTime === nextFeedingTime.toISOString() &&
          n.metadata.reminderInterval === reminderInterval
        );
        if (!alreadySent) {
          // Send a new reminder notification for this interval
          await createNotification({
            title: `Alimentação atrasada: ${cat.name}`,
            message: `${cat.name} deveria ter sido alimentado às ${nextFeedingTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
            type: 'reminder',
            metadata: {
              catId: String(cat.id),
              scheduledTime: nextFeedingTime.toISOString(),
              reminderInterval,
            },
          });
          notificationsCreated++;
        }
      } else {
        // Not overdue, use existing notification logic (reminder, etc.)
        const notifications = generateFeedingNotifications(
          {
            id: String(cat.id),
            name: cat.name,
            photoUrl: cat.photo_url || undefined,
            birthdate: cat.birthdate ? new Date(cat.birthdate) : undefined,
            weight: typeof cat.weight === 'string' ? parseFloat(cat.weight) : cat.weight,
            restrictions: cat.restrictions || undefined,
            notes: cat.notes || undefined,
            householdId: String(cat.householdId),
            feedingInterval: typeof cat.feeding_interval === 'string' ? parseInt(cat.feeding_interval) : (cat.feeding_interval ?? 0),
            portionSize: cat.portion_size || undefined,
          },
          nextFeedingTime,
          'system-cron',
          lastFeedingTime
        );
        for (const notification of notifications) {
          const payload = {
            title: notification.title,
            message: notification.message,
            type: notification.type,
            metadata: {
              catId: String(cat.id),
              scheduledTime: nextFeedingTime.toISOString(),
            },
          };
          await createNotification(payload);
          notificationsCreated++;
        }
      }
    }
    feedingNotificationMonitor.successes++;
    feedingNotificationMonitor.lastDurationMs = Date.now() - start;
    feedingNotificationMonitor.lastError = null;
    return NextResponse.json({
      ok: true,
      notificationsCreated,
      metrics: feedingNotificationMonitor,
    });
  } catch (error: any) {
    feedingNotificationMonitor.failures++;
    feedingNotificationMonitor.lastDurationMs = Date.now() - start;
    feedingNotificationMonitor.lastError = error?.message || String(error);
    return NextResponse.json({
      ok: false,
      error: error?.message || String(error),
      metrics: feedingNotificationMonitor,
    }, { status: 500 });
  }
} 