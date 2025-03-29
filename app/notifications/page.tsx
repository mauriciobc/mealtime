"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { ArrowLeft, CheckSquare, Loader2, Bell, Check, CheckCheck, Trash2, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/page-transition";
import { useNotifications } from "@/lib/context/NotificationContext";
import { NotificationItem } from "@/components/notifications/notification-item";
import BottomNav from "@/components/bottom-nav";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { motion } from "framer-motion";
import { useAppContext } from "@/lib/context/AppContext";
import { Notification } from "@/lib/types/notification";

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
const NotificationCard = memo(({ 
  notification, 
  onMarkAsRead, 
  onRemove 
}: { 
  notification: Notification;
  onMarkAsRead: (notification: Notification) => void;
  onRemove: (notification: Notification) => void;
}) => {
  const formattedDate = useMemo(() => 
    format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    [notification.createdAt]
  );

  return (
    <Card className={`hover:shadow-md transition-shadow ${!notification.isRead ? "border-primary/30 bg-primary/5" : ""}`}>
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
          >
            <Trash2 size={14} className="mr-1" />
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

NotificationCard.displayName = "NotificationCard";

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { dispatch } = useAppContext();

  // Load notifications on mount
  useEffect(() => {
    setIsMounted(true);
    refreshNotifications();
    return () => setIsMounted(false);
  }, [refreshNotifications]);

  // Handlers memoizados
  const handleMarkAllAsRead = useCallback(async () => {
    if (!isMounted) return;
    try {
      setIsMarkingAllRead(true);
      await markAllAsRead();
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch (error) {
      toast.error("Não foi possível marcar todas as notificações como lidas");
    } finally {
      if (isMounted) {
        setIsMarkingAllRead(false);
      }
    }
  }, [isMounted, markAllAsRead]);

  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    if (!isMounted) return;
    try {
      await markAsRead(notification.id);
      if (dispatch) {
        dispatch({
          type: "MARK_NOTIFICATION_READ",
          payload: { id: notification.id }
        });
      }
      toast.success("Notificação marcada como lida");
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      toast.error("Não foi possível marcar a notificação como lida");
    }
  }, [isMounted, markAsRead, dispatch]);

  const handleRemoveNotification = useCallback(async (notification: Notification) => {
    if (!isMounted) return;
    try {
      if (dispatch) {
        dispatch({
          type: "REMOVE_NOTIFICATION",
          payload: { id: notification.id }
        });
      }
      toast.success("Notificação removida");
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
      toast.error("Não foi possível remover a notificação");
    }
  }, [isMounted, dispatch]);

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

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader title="Notificações" showBackButton />
        
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Suas Notificações</h1>
            
            {notifications.filter(n => !n.isRead).length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2"
                disabled={isMarkingAllRead}
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
          
          {isLoading ? (
            loadingSkeleton
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-6">
                Nenhuma notificação para exibir.
              </p>
              <Link href="/">
                <Button>Voltar para o Início</Button>
              </Link>
            </div>
          ) : (
            <motion.div 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {notifications.map((notification) => (
                <motion.div key={notification.id} variants={itemVariants}>
                  <NotificationCard
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onRemove={handleRemoveNotification}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
        
        <BottomNav />
      </div>
    </PageTransition>
  );
}
