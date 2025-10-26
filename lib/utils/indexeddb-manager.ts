import { Notification, CacheMetadata } from '@/lib/types/notification';

const DB_NAME = 'mealtime-notifications';
const DB_VERSION = 1;

interface Stores {
  notifications: Notification;
  metadata: CacheMetadata;
}

export class NotificationCacheManager {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) {
      console.log('[IndexedDBManager] Already initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDBManager] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDBManager] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create notifications store
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notificationStore.createIndex('user_id', 'userId', { unique: false });
          notificationStore.createIndex('is_read', 'isRead', { unique: false });
          notificationStore.createIndex('created_at', 'createdAt', { unique: false });
          notificationStore.createIndex('user_read', ['userId', 'isRead'], { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'userId' });
          metadataStore.createIndex('last_sync', 'lastSync', { unique: false });
        }

        console.log('[IndexedDBManager] Database upgrade completed');
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Save notifications to cache
   */
  async saveNotifications(userId: string, notifications: Notification[]): Promise<void> {
    // Validate userId parameter
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('[IndexedDBManager] saveNotifications called with invalid userId:', userId);
      return;
    }

    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction('notifications', 'readwrite');
        const store = transaction.objectStore('notifications');

        // Clear existing notifications for this user
        const index = store.index('user_id');
        const range = IDBKeyRange.only(userId);
        const clearRequest = index.openCursor(range);
        
        clearRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            // All existing notifications cleared, now add new ones
            const addPromises = notifications.map(n => {
              return new Promise<void>((resolveAdd, rejectAdd) => {
                const request = store.add(n);
                request.onsuccess = () => resolveAdd();
                request.onerror = () => rejectAdd(request.error);
              });
            });

            Promise.all(addPromises)
              .then(() => {
                console.log(`[IndexedDBManager] Saved ${notifications.length} notifications`);
                resolve();
              })
              .catch(reject);
          }
        };
        clearRequest.onerror = () => {
          console.error('[IndexedDBManager] Error in saveNotifications clear request:', clearRequest.error);
          reject(clearRequest.error);
        };
      } catch (error) {
        console.error('[IndexedDBManager] Error in saveNotifications:', error);
        reject(error);
      }
    });
  }

  /**
   * Get notifications from cache with pagination
   */
  async getNotifications(userId: string, page: number = 1, limit: number = 10): Promise<Notification[]> {
    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('notifications', 'readonly');
      const store = transaction.objectStore('notifications');
      const index = store.index('created_at');
      
      const notifications: Notification[] = [];
      let count = 0;
      const skip = (page - 1) * limit;

      index.openCursor(null, 'prev').onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const notification = cursor.value as Notification;
          
          // Filter by user_id
          if (notification.userId === userId) {
            if (count >= skip && notifications.length < limit) {
              notifications.push(notification);
            }
            count++;
          }
          
          cursor.continue();
        } else {
          console.log(`[IndexedDBManager] Retrieved ${notifications.length} notifications from cache`);
          resolve(notifications);
        }
      };
    });
  }

  /**
   * Update a specific notification (upsert behavior)
   * If notification doesn't exist, it will be created
   */
  async updateNotification(id: string, updates: Partial<Notification>): Promise<void> {
    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('notifications', 'readwrite');
      const store = transaction.objectStore('notifications');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existingNotification = getRequest.result;
        
        let updatedNotification: Notification;
        
        if (existingNotification) {
          // Update existing notification
          updatedNotification = { ...existingNotification, ...updates };
        } else {
          // Create new notification from updates (ensure all required fields)
          // Note: updates should contain all required Notification fields
          const notificationData = updates as any;
          updatedNotification = {
            id,
            title: notificationData.title || '',
            message: notificationData.message || '',
            type: notificationData.type || 'info',
            isRead: notificationData.isRead ?? false,
            createdAt: notificationData.createdAt || new Date().toISOString(),
            updatedAt: notificationData.updatedAt || new Date().toISOString(),
            userId: notificationData.userId || '',
            metadata: notificationData.metadata,
          };
        }
        
        const updateRequest = store.put(updatedNotification);
        updateRequest.onsuccess = () => {
          const action = existingNotification ? 'Updated' : 'Created';
          console.log(`[IndexedDBManager] ${action} notification ${id}`);
          resolve();
        };
        updateRequest.onerror = () => {
          console.error(`[IndexedDBManager] Error ${existingNotification ? 'updating' : 'creating'} notification:`, updateRequest.error);
          reject(updateRequest.error);
        };
      };
      getRequest.onerror = () => {
        console.error('[IndexedDBManager] Error getting notification:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * Get unread count from cache
   */
  async getUnreadCount(userId: string): Promise<number> {
    console.log('[IndexedDBManager] getUnreadCount called with userId:', userId, 'type:', typeof userId);
    
    // Validate userId parameter
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('[IndexedDBManager] getUnreadCount called with invalid userId:', userId);
      return 0;
    }

    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction('notifications', 'readonly');
        const store = transaction.objectStore('notifications');
        const index = store.index('user_id');
        
        // Use user_id index instead of user_read composite index
        console.log('[IndexedDBManager] Using user_id index with userId:', userId);
        const range = IDBKeyRange.only(userId);
        
        let count = 0;
        
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const notification = cursor.value;
            // Filter for unread notifications
            if (!notification.isRead) {
              count++;
            }
            cursor.continue();
          } else {
            console.log(`[IndexedDBManager] Found ${count} unread notifications for user ${userId}`);
            resolve(count);
          }
        };
        request.onerror = () => {
          console.error('[IndexedDBManager] Error in getUnreadCount cursor request:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('[IndexedDBManager] Error creating IDBKeyRange in getUnreadCount:', error);
        reject(error);
      }
    });
  }

  /**
   * Clear cache for a specific user
   */
  async clearCache(userId: string): Promise<void> {
    // Validate userId parameter
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('[IndexedDBManager] clearCache called with invalid userId:', userId);
      return;
    }

    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction('notifications', 'readwrite');
        const store = transaction.objectStore('notifications');
        const index = store.index('user_id');
        const range = IDBKeyRange.only(userId);
        
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            console.log(`[IndexedDBManager] Cleared cache for user ${userId}`);
            resolve();
          }
        };
        request.onerror = () => {
          console.error('[IndexedDBManager] Error in clearCache cursor request:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('[IndexedDBManager] Error in clearCache:', error);
        reject(error);
      }
    });
  }

  /**
   * Get metadata for a user
   */
  async getMetadata(userId: string): Promise<CacheMetadata | null> {
    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('metadata', 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(userId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Set metadata for a user
   */
  async setMetadata(metadata: CacheMetadata): Promise<void> {
    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('metadata', 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put(metadata);
      
      request.onsuccess = () => {
        console.log(`[IndexedDBManager] Updated metadata for user ${metadata.userId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[IndexedDBManager] Database closed');
    }
  }
}

// Export singleton instance
export const cacheManager = new NotificationCacheManager();
