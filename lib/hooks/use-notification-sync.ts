import { useCallback, useEffect, useState } from 'react';
import { useNotifications } from '@/lib/context/NotificationContext';
import { notificationSync } from '@/lib/utils/notification-sync';
import { useUserContext } from '@/lib/context/UserContext';

export function useNotificationSync() {
  const { isSyncing, connectionStatus, isOnline } = useNotifications();
  const { state: userState } = useUserContext();
  const currentUserId = userState.currentUser?.id;
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
    while (notificationSync.isSyncing()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, []);

  /**
   * Setup automatic sync interval (every 5 minutes)
   */
  useEffect(() => {
    if (!isOnline || !currentUserId) {
      return;
    }

    // Only auto-sync if connected
    if (connectionStatus === 'connected') {
      const interval = setInterval(async () => {
        console.log('[useNotificationSync] Auto-sync triggered');
        try {
          await syncNow(currentUserId);
        } catch (_error) {
          console.error('[useNotificationSync] Auto-sync failed:', _error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      setAutoSyncInterval(interval);

      return () => {
        clearInterval(interval);
        setAutoSyncInterval(null);
      };
    }
  }, [isOnline, connectionStatus, currentUserId, syncNow]);

  // Poll last sync time
  useEffect(() => {
    const interval = setInterval(() => {
      const syncTime = notificationSync.getLastSyncTime();
      if (syncTime) {
        setLastSync(syncTime);
      }
    }, 10000); // Poll every 10 seconds

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
