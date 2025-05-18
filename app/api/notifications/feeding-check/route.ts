import { NextRequest, NextResponse } from 'next/server';
import { getCatsWithSchedulesAndLastFeeding } from '@/lib/services/feeding-service';
import { generateFeedingNotifications } from '@/lib/services/feeding-notification-service';
import { createNotification } from '@/lib/services/notificationService';
import { PerformanceMonitor } from '@/lib/utils/PerformanceMonitor';

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
    // 1. Fetch all cats with their schedules and last feeding log
    const cats = await getCatsWithSchedulesAndLastFeeding();
    // 2. For each cat, generate due notifications
    for (const cat of cats) {
      const notifications = generateFeedingNotifications(
        cat,
        cat.nextFeedingTime,
        cat.userId,
        cat.lastFeedingTime
      );
      // 3. For each notification, POST to /api/notifications (call service directly)
      for (const notification of notifications) {
        await createNotification(notification);
        notificationsCreated++;
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