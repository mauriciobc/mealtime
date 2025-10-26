import { Notification, CacheMetadata } from '@/lib/types/notification';
import { notificationService } from '@/lib/services/supabase-notification-service';
import { cacheManager } from './indexeddb-manager';

export interface SyncResult {
  success: boolean;
  notificationsSynced: number;
  error?: string;
  timestamp: string;
}

export class NotificationSync {
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;

  /**
   * Sync notifications from server to cache
   * Implements cache-first strategy with background sync
   */
  async syncFromServer(userId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[NotificationSync] Sync already in progress, skipping');
      return {
        success: false,
        notificationsSynced: 0,
        error: 'Sync already in progress',
        timestamp: new Date().toISOString(),
      };
    }

    this.syncInProgress = true;
    console.log(`[NotificationSync] Starting sync for user ${userId}`);

    try {
      // Get notifications from server
      const response = await notificationService.getNotifications(1, 100); // Get first 100
      const unreadCount = await notificationService.getUnreadCount();

      // Save to cache
      await cacheManager.saveNotifications(userId, response.notifications);

      // Update metadata
      const metadata: CacheMetadata = {
        userId,
        lastSync: new Date().toISOString(),
        version: 1,
        lastUpdated: new Date().toISOString(),
      };
      await cacheManager.setMetadata(metadata);

      this.lastSyncTime = new Date();

      const result: SyncResult = {
        success: true,
        notificationsSynced: response.notifications.length,
        timestamp: new Date().toISOString(),
      };

      console.log(`[NotificationSync] Sync completed: ${result.notificationsSynced} notifications`);
      return result;
    } catch (error) {
      console.error('[NotificationSync] Sync failed:', error);
      const result: SyncResult = {
        success: false,
        notificationsSynced: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Retry sync with exponential backoff
   */
  async syncWithRetry(userId: string, maxRetries: number = 3): Promise<SyncResult> {
    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < maxRetries) {
      try {
        const result = await this.syncFromServer(userId);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      attempt++;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[NotificationSync] Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      notificationsSynced: 0,
      error: lastError || 'Max retries exceeded',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if sync is needed based on last sync time
   */
  shouldSync(lastSyncTime: string | null, maxAge: number = 60000): boolean {
    if (!lastSyncTime) return true;

    const lastSync = new Date(lastSyncTime);
    const now = new Date();
    const age = now.getTime() - lastSync.getTime();

    return age > maxAge;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }

  /**
   * Sync specific notification update
   */
  async syncNotificationUpdate(notification: Notification): Promise<void> {
    console.log(`[NotificationSync] Syncing notification update: ${notification.id}`);
    
    try {
      await cacheManager.updateNotification(notification.id, notification);
    } catch (error) {
      console.error('[NotificationSync] Failed to sync notification update:', error);
    }
  }
}

// Export singleton instance
export const notificationSync = new NotificationSync();
