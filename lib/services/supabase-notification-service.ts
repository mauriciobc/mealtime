import { createClient } from '@/utils/supabase/client';
import { Notification, PaginatedNotificationResponse } from '@/lib/types/notification';

/**
 * Unified notification service using Supabase client
 * Replaces the old API route-based service
 */
export class SupabaseNotificationService {
  private supabase = createClient();

  /**
   * Normalize notification data from Supabase format to client format
   * @throws {Error} If required fields (created_at, updated_at, user_id) are missing
   */
  private normalizeNotification(raw: any): Notification {
    // Validate required fields
    if (!raw.created_at) {
      throw new Error('Missing required notification field: created_at');
    }
    if (!raw.updated_at) {
      throw new Error('Missing required notification field: updated_at');
    }
    if (!raw.user_id) {
      throw new Error('Missing required notification field: user_id');
    }

    return {
      id: String(raw.id),
      title: raw.title,
      message: raw.message,
      type: raw.type,
      isRead: raw.is_read ?? false,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      userId: raw.user_id,
      metadata: raw.metadata ?? undefined,
    };
  }

  /**
   * Get notifications with pagination
   */
  async getNotifications(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedNotificationResponse> {
    console.log(`[SupabaseNotificationService] getNotifications: page=${page}, limit=${limit}`);
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get total count
    const { count, error: countError } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('[SupabaseNotificationService] Count error:', countError);
      throw new Error('Failed to get notifications count');
    }

    // Get paginated notifications
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[SupabaseNotificationService] Fetch error:', error);
      throw new Error(error.message);
    }

    // Normalize notifications and handle potential data integrity issues
    const notifications = (data || []).map(n => {
      try {
        return this.normalizeNotification(n);
      } catch (error) {
        console.error('[SupabaseNotificationService] Failed to normalize notification:', error, n);
        throw error; // Re-throw to propagate the error
      }
    });
    
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      notifications,
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    console.log('[SupabaseNotificationService] getUnreadCount');
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[SupabaseNotificationService] Unread count error:', error);
      throw new Error(error.message);
    }

    return count || 0;
  }

  /**
   * Mark one or more notifications as read
   */
  async markAsRead(ids: string[]): Promise<void> {
    console.log(`[SupabaseNotificationService] markAsRead: ${ids.length} notifications`);
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('[SupabaseNotificationService] Mark as read error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Mark all notifications as read for the current user
   */
  async markAllAsRead(): Promise<void> {
    console.log('[SupabaseNotificationService] markAllAsRead');
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[SupabaseNotificationService] Mark all as read error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    console.log(`[SupabaseNotificationService] deleteNotification: ${id}`);
    
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[SupabaseNotificationService] Delete error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a new notification via API route
   * This ensures proper authentication and authorization through the API layer
   */
  async createNotification(
    payload: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
  ): Promise<Notification> {
    console.log('[SupabaseNotificationService] createNotification via API');
    
    // Get the auth session to include in the request
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) {
      throw new Error('Unauthorized: No active session');
    }

    try {
      // Call the API route to create the notification
      const response = await fetch('/api/v2/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: payload.title,
          message: payload.message,
          type: payload.type,
          isRead: payload.isRead ?? false,
          metadata: payload.metadata || {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to create notification: ${response.statusText}`;
        console.error('[SupabaseNotificationService] API error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from API: missing data');
      }

      console.log('[SupabaseNotificationService] Notification created successfully:', result.data.id);
      
      // Return the notification in the expected format
      return {
        id: result.data.id,
        title: result.data.title,
        message: result.data.message,
        type: result.data.type,
        isRead: result.data.isRead,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
        userId: result.data.userId,
        metadata: result.data.metadata,
      };
    } catch (error) {
      console.error('[SupabaseNotificationService] Create notification error:', error);
      throw error instanceof Error ? error : new Error('Failed to create notification');
    }
  }
}

// Export singleton instance
export const notificationService = new SupabaseNotificationService();
