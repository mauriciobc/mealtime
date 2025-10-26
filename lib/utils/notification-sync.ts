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
  private syncPromise: Promise<SyncResult> | null = null;
  private lastSyncTime: Date | null = null;

  /**
   * Sync notifications from server to cache
   * Implements cache-first strategy with background sync
   * Uses Promise-based lock to prevent concurrent syncs
   */
  async syncFromServer(userId: string): Promise<SyncResult> {
    // Validate userId parameter
    if (userId === undefined || userId === null || userId.trim() === '') {
      const error = new Error('Invalid userId');
      console.error('[NotificationSync] userId validation failed:', error.message);
      return Promise.reject(error);
    }

    // If sync is already in progress, return the existing promise
    if (this.syncPromise) {
      console.log('[NotificationSync] Sync already in progress, awaiting existing sync');
      return this.syncPromise;
    }

    // Start new sync and store the promise
    console.log(`[NotificationSync] Starting sync for user ${userId}`);
    this.syncPromise = this._doSync(userId);

    try {
      return await this.syncPromise;
    } finally {
      // Clear the promise when sync completes (success or failure)
      this.syncPromise = null;
    }
  }

  /**
   * Private method that performs the actual sync operation
   * Fetches ALL notifications from the server using pagination to avoid data truncation
   */
  private async _doSync(userId: string): Promise<SyncResult> {
    try {
      // Fetch all notifications using pagination
      const allNotifications: Notification[] = [];
      let currentPage = 1;
      const pageSize = 100; // Fetch 100 notifications per page
      let hasMore = true;

      console.log(`[NotificationSync] Starting paginated fetch for user ${userId}`);

      // Loop through all pages until no more data
      while (hasMore) {
        const response = await notificationService.getNotifications(currentPage, pageSize);
        
        console.log(`[NotificationSync] Fetched page ${currentPage}: ${response.notifications.length} notifications`);
        
        allNotifications.push(...response.notifications);
        hasMore = response.hasMore;
        currentPage++;

        // Safety check to prevent infinite loops (max 1000 pages = 100k notifications)
        if (currentPage > 1000) {
          console.warn('[NotificationSync] Reached maximum page limit, stopping fetch');
          break;
        }
      }

      console.log(`[NotificationSync] Total notifications fetched: ${allNotifications.length}`);

      // Save all notifications to cache
      await cacheManager.saveNotifications(userId, allNotifications);

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
        notificationsSynced: allNotifications.length,
        timestamp: new Date().toISOString(),
      };

      console.log(`[NotificationSync] Sync completed: ${result.notificationsSynced} notifications saved to cache`);
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
    }
  }

  /**
   * Retry sync with exponential backoff
   */
  async syncWithRetry(userId: string, maxRetries: number = 3): Promise<SyncResult> {
    // Validate userId parameter
    if (userId === undefined || userId === null || userId.trim() === '') {
      const error = new Error('Invalid userId');
      console.error('[NotificationSync] userId validation failed:', error.message);
      return Promise.reject(error);
    }

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
    return this.syncPromise !== null;
  }

  /**
   * Sync specific notification update
   * @param userId - The user ID to ensure cache updates affect the correct user
   * @param notification - The notification to update
   * @returns true if successful, throws error on failure
   */
  async syncNotificationUpdate(userId: string, notification: Notification): Promise<boolean> {
    // Validate userId parameter
    if (userId === undefined || userId === null || userId.trim() === '') {
      const error = new Error('Invalid userId');
      console.error('[NotificationSync] userId validation failed:', error.message);
      throw error;
    }

    console.log(`[NotificationSync] Syncing notification update for user ${userId}: ${notification.id}`);
    
    try {
      await cacheManager.updateNotification(userId, notification.id, { ...notification });
      return true;
    } catch (error) {
      console.error('[NotificationSync] Failed to sync notification update:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationSync = new NotificationSync();
