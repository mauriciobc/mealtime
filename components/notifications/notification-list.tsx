"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '@/lib/context/NotificationContext';
import { NotificationItem } from './notification-item';
import { Loader2 } from 'lucide-react';

export function NotificationList() {
  const { 
    notifications, 
    isLoading, 
    error, 
    hasMore, 
    loadMore 
  } = useNotifications();
  const observer = useRef<IntersectionObserver>();
  const lastNotificationRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, loadMore]);

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Nenhuma notificação encontrada
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          ref={index === notifications.length - 1 ? lastNotificationRef : undefined}
        >
          <NotificationItem notification={notification} />
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      )}
    </div>
  );
} 