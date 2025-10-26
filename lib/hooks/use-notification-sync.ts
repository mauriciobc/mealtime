import { useCallback, useEffect, useState } from 'react';
import { useNotifications } from '@/lib/context/NotificationContext';
import { notificationSync } from '@/lib/utils/notification-sync';

export function useNotificationSync() {
  const { isSyncing, connectionStatus, isOnline } = useNotifications();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [autoSyncInterval, setAutoSyncInterval] = useState<NodeJS.Timeout | null>(null);

  /**
   * Force a sync now
   */
  const syncNow = useCallback(async (userId: string) => {
    console.log('[useNotificationSync] Manual sync requested');
    const result = await notificationSync.syncFromServer(userId);
    if (result.success) {
      setLastSync(new Date());
    }
    return result;
  }, []);

  /**
   * Wait for current sync to complete
   */
  const waitForSync = useCallback(async () => {
    while (isSyncing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [isSyncing]);

  /**
   * Setup automatic sync interval (every 5 minutes)
   */
  useEffect(() => {
    if (!isOnline) {
      // Clear interval when offline
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        setAutoSyncInterval(null);
      }
      return;
    }

    // Only auto-sync if connected
    if (connectionStatus === 'connected') {
      const interval = setInterval(() => {
        console.log('[useNotificationSync] Auto-sync triggered');
        // Note: userId would need to be passed or retrieved from context
      }, 5 * 60 * 1000); // 5 minutes

      setAutoSyncInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isOnline, connectionStatus, autoSyncInterval]);

  /**
   * Get last sync time from notificationSync
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const syncTime = notificationSync.getLastSyncTime();
      if (syncTime) {
        setLastSync(syncTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    syncNow,
    waitForSync,
    isSyncing,
    lastSync,
    canSync: isOnline && connectionStatus !== 'error',
  };
}
