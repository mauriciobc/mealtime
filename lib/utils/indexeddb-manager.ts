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
          // TODO: Consider adding compound index ['userId', 'createdAt'] for direct reverse-ordered pagination
          // This would allow fetching paged results directly without in-memory sorting
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
            // Create all store.add requests synchronously in the same tick to keep transaction alive
            let errorCount = 0;
            const addErrors: DOMException[] = [];
            
            for (const notification of notifications) {
              const request = store.add(notification);
              
              // Optional: attach per-request handlers for logging if desired
              request.onsuccess = () => {
                // Individual success - can log here if needed
              };
              
              request.onerror = () => {
                errorCount++;
                if (request.error) {
                  addErrors.push(request.error);
                  console.error('[IndexedDBManager] Error adding notification:', request.error);
                }
              };
            }
            
            // Transaction lifecycle handlers
            transaction.oncomplete = () => {
              if (errorCount > 0) {
                console.error(`[IndexedDBManager] Transaction completed with ${errorCount} errors`);
                reject(addErrors[0] || new Error('Failed to add some notifications'));
              } else {
                console.log(`[IndexedDBManager] Saved ${notifications.length} notifications`);
                resolve();
              }
            };
            
            transaction.onerror = () => {
              console.error('[IndexedDBManager] Transaction error:', transaction.error);
              reject(transaction.error || new Error('Transaction failed'));
            };
            
            transaction.onabort = () => {
              console.error('[IndexedDBManager] Transaction aborted');
              reject(new Error('Transaction was aborted'));
            };
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
   * Optimized to use user_id index to iterate only target user's records,
   * eliminating O(totalRecords) scanning of unrelated records.
   */
  async getNotifications(userId: string, page: number = 1, limit: number = 10): Promise<Notification[]> {
    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('notifications', 'readonly');
      const store = transaction.objectStore('notifications');
      
      // Use user_id index to iterate only this user's records
      const index = store.index('user_id');
      const range = IDBKeyRange.only(userId);
      
      const allUserNotifications: Notification[] = [];

      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const notification = cursor.value as Notification;
          allUserNotifications.push(notification);
          cursor.continue();
        } else {
          // All user's records collected, now sort by createdAt descending
          allUserNotifications.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA; // Descending order (newest first)
          });
          
          // Apply pagination
          const skip = (page - 1) * limit;
          const paginatedNotifications = allUserNotifications.slice(skip, skip + limit);
          
          console.log(`[IndexedDBManager] Retrieved ${paginatedNotifications.length} notifications from cache (page ${page}, total for user: ${allUserNotifications.length})`);
          resolve(paginatedNotifications);
        }
      };
      
      request.onerror = () => {
        console.error('[IndexedDBManager] Error in getNotifications cursor request:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update a specific notification (upsert behavior)
   * If notification doesn't exist, it will be created
   * @param userId - The user ID to ensure we only update notifications for the correct user
   * @param id - The notification ID
   * @param updates - The notification data to update
   */
  async updateNotification(userId: string, id: string, updates: Partial<Notification>): Promise<void> {
    // Validate userId parameter
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('[IndexedDBManager] updateNotification called with invalid userId:', userId);
      throw new Error(`Invalid userId: ${userId}`);
    }

    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('notifications', 'readwrite');
      const store = transaction.objectStore('notifications');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existingNotification = getRequest.result;
        
        // Validate that existing notification belongs to the correct user
        if (existingNotification && existingNotification.userId !== userId) {
          console.error(`[IndexedDBManager] Attempted to update notification ${id} for different user. Expected: ${userId}, Found: ${existingNotification.userId}`);
          reject(new Error(`Notification ${id} does not belong to user ${userId}`));
          return;
        }
        
        let updatedNotification: Notification;
        
        if (existingNotification) {
          // Update existing notification, but ensure userId matches
          updatedNotification = { ...existingNotification, ...updates, userId };
        } else {
          // Create new notification from updates (ensure all required fields)
          // Note: updates should contain all required Notification fields
          const notificationData = updates as any;
          
          // Validate required fields before creating new notification
          const title = notificationData?.title;
          const message = notificationData?.message;
          const type = notificationData?.type;
          
          // Ensure all critical fields are present and non-empty
          if (!title || typeof title !== 'string' || title.trim() === '') {
            console.error('[IndexedDBManager] Cannot create notification: missing or invalid title');
            reject(new Error('Cannot create notification: title is required and must be non-empty'));
            return;
          }
          
          if (!message || typeof message !== 'string' || message.trim() === '') {
            console.error('[IndexedDBManager] Cannot create notification: missing or invalid message');
            reject(new Error('Cannot create notification: message is required and must be non-empty'));
            return;
          }
          
          if (!type || typeof type !== 'string' || type.trim() === '') {
            console.error('[IndexedDBManager] Cannot create notification: missing or invalid type');
            reject(new Error('Cannot create notification: type is required and must be non-empty'));
            return;
          }
          
          // Only create notification when validation passes
          const now = new Date().toISOString();
          updatedNotification = {
            id,
            title: title.trim(),
            message: message.trim(),
            type: type.trim() as any,
            isRead: notificationData.isRead ?? false,
            createdAt: notificationData.createdAt || now,
            updatedAt: notificationData.updatedAt || now,
            userId: userId,
            metadata: notificationData.metadata,
          };
        }
        
        const updateRequest = store.put(updatedNotification);
        updateRequest.onsuccess = () => {
          const action = existingNotification ? 'Updated' : 'Created';
          console.log(`[IndexedDBManager] ${action} notification ${id} for user ${userId}`);
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
   * Get total count of notifications from cache
   */
  async getTotalCount(userId: string): Promise<number> {
    console.log('[IndexedDBManager] getTotalCount called with userId:', userId, 'type:', typeof userId);
    
    // Validate userId parameter
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('[IndexedDBManager] getTotalCount called with invalid userId:', userId);
      return 0;
    }

    await this.ensureInit();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction('notifications', 'readonly');
        const store = transaction.objectStore('notifications');
        const index = store.index('user_id');
        
        // Use user_id index to count all notifications for this user
        console.log('[IndexedDBManager] Using user_id index with userId:', userId);
        const range = IDBKeyRange.only(userId);
        
        let count = 0;
        
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            // Count all notifications regardless of read status
            count++;
            cursor.continue();
          } else {
            console.log(`[IndexedDBManager] Found ${count} total notifications for user ${userId}`);
            resolve(count);
          }
        };
        request.onerror = () => {
          console.error('[IndexedDBManager] Error in getTotalCount cursor request:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('[IndexedDBManager] Error creating IDBKeyRange in getTotalCount:', error);
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
