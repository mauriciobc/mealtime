"use client";

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { ArrowLeft, CheckSquare, Loader2, Bell, Check, CheckCheck, Trash2, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/page-transition";
import { useNotifications } from "@/lib/context/NotificationContext";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useAppContext } from "@/lib/context/AppContext";
import { Notification } from "@/lib/types/notification";
import { cn } from "@/lib/utils";
// import { useVirtualizer } from '@tanstack/react-virtual'; // Comment out virtualizer import

// Componente memoizado para o ícone de notificação
const NotificationIcon = ({ type }: { type: string }) => {
  const icon = useMemo(() => {
    switch (type) {
      case "feeding":
        return <Clock className="h-5 w-5 text-primary" />;
      case "reminder":
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case "system":
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  }, [type]);

  return icon;
};

// Componente memoizado para o item de notificação
const NotificationCard = (({ 
  notification, 
  onMarkAsRead, 
  onRemove 
}: { 
  notification: Notification;
  onMarkAsRead: (notification: Notification) => void;
  onRemove: (notification: Notification) => void;
}) => {
  const { isLoading } = useNotifications();
  const formattedDate = useMemo(() => 
    format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    [notification.createdAt]
  );

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      !notification.isRead && "border-primary/30 bg-primary/5",
      isLoading && "opacity-50 pointer-events-none"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <NotificationIcon type={notification.type} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{notification.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {formattedDate}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-2 gap-2">
          {!notification.isRead && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onMarkAsRead(notification)}
              className="text-xs h-8"
              disabled={isLoading}
            >
              <Check size={14} className="mr-1" />
              Marcar como lida
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onRemove(notification)}
            className="text-xs text-destructive h-8"
            disabled={isLoading}
          >
            <Trash2 size={14} className="mr-1" />
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error,
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    refreshNotifications 
  } = useNotifications();
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const mountedRef = useRef(true);
  const router = useRouter();

  // --- Remove Virtualizer --- 
  // const parentRef = useRef<HTMLDivElement>(null);
  // const rowVirtualizer = useVirtualizer({
  //   count: notifications.length,
  //   getScrollElement: () => parentRef.current,
  //   estimateSize: () => 100, 
  //   overscan: 5 
  // });
  // --------------------------

  useEffect(() => {
    console.log(`[NotificationsPage] Component mounted/updated, current notifications:`, {
      count: notifications.length,
      unreadCount,
      isLoading,
      lastUpdated,
    });
    // Optional: Refresh on mount if needed, but provider might handle initial load
    // if (mountedRef.current) {
    //   refreshNotifications();
    // }
    return () => {
      mountedRef.current = false;
      console.log(`[NotificationsPage] Component unmounted`);
    };
  // Removed notifications from dependency array to avoid excessive logging/refreshing
  }, [refreshNotifications, unreadCount, isLoading, lastUpdated]); 

  // Handlers memoizados
  const handleMarkAllAsRead = useCallback(async () => {
    if (!mountedRef.current) return;
    console.log(`[NotificationsPage] Marking all notifications as read`);
    try {
      setIsMarkingAllRead(true);
      await markAllAsRead();
      if (mountedRef.current) {
        toast.success("Todas as notificações foram marcadas como lidas");
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error(`[NotificationsPage] Error marking all as read:`, error);
        toast.error("Não foi possível marcar todas as notificações como lidas");
      }
    } finally {
      if (mountedRef.current) {
        setIsMarkingAllRead(false); 
        setLastUpdated(Date.now());
      }
    }
  }, [markAllAsRead]);

  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    if (!mountedRef.current) return;
    console.log(`[NotificationsPage] Marking notification as read:`, {
      id: notification.id,
      title: notification.title,
      isRead: notification.isRead
    });
    try {
      await markAsRead(notification.id);
      if (mountedRef.current) {
        toast.success("Notificação marcada como lida");
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error(`[NotificationsPage] Error marking as read:`, error);
        toast.error("Não foi possível marcar a notificação como lida");
      }
    } finally {
      if (mountedRef.current) {
        setLastUpdated(Date.now());
      }
    }
  }, [markAsRead]);

  const handleRemoveNotification = useCallback(async (notification: Notification) => {
    if (!mountedRef.current) return;
    console.log(`[NotificationsPage] Delete button clicked for notification:`, {
      id: notification.id,
      title: notification.title,
      isRead: notification.isRead,
      type: notification.type,
      currentNotificationsCount: notifications.length,
      currentUnreadCount: unreadCount
    });
    try {
      await removeNotification(notification.id);
      if (mountedRef.current) {
        toast.success("Notificação removida com sucesso");
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error(`[NotificationsPage] Error removing notification:`, error);
        toast.error("Não foi possível remover a notificação");
      }
    } finally {
      if (mountedRef.current) {
        setLastUpdated(Date.now());
      }
    }
  }, [removeNotification]);

  // Animações memoizadas
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }), []);

  // Loading skeleton memoizado
  const loadingSkeleton = useMemo(() => (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 bg-muted rounded"></div>
                <div className="h-3 w-1/2 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ), []);

  // --- Debug Button State --- 
  const shouldShowButton = notifications.filter(n => !n.isRead).length > 0;
  const buttonDisabled = isLoading || isMarkingAllRead;
  console.log('[NotificationsPage] Render - Button State Check:', { isLoading, isMarkingAllRead, shouldShowButton, buttonDisabled });
  // --------------------------

  return (
    <PageTransition>
      <div className="container max-w-2xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Suas Notificações</h1>
          </div>
          
          {shouldShowButton && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2"
              disabled={buttonDisabled}
            >
              {isMarkingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck size={16} />
              )}
              <span>Marcar todas como lidas</span>
            </Button>
          )}
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}
        
        {isLoading ? (
          loadingSkeleton
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-6">
              Nenhuma notificação para exibir.
            </p>
            <Button onClick={() => router.back()}>
              Voltar
            </Button>
          </div>
        ) : (
          <motion.div 
            className="space-y-4 overflow-y-auto h-[calc(100vh-200px)]" // Add scroll and height here
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* --- Render directly using map --- */} 
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                variants={itemVariants}
                layout // Keep layout animation if desired
              >
                {/* Use NotificationCard which includes actions */}
                <NotificationCard
                  notification={notification}
                  onMarkAsRead={() => handleMarkAsRead(notification)}
                  onRemove={() => handleRemoveNotification(notification)}
                />
                 {/* Or use NotificationItem if that's the intended component 
                 <NotificationItem
                   notification={notification}
                   onClick={() => {}} // Add necessary props if using NotificationItem
                   showActions={true}
                 />
                 */}
              </motion.div>
            ))}
            {/* ---------------------------------- */}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
