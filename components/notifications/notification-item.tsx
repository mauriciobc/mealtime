"use client";

import { Notification } from "@/lib/types/notification";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  Bell, 
  Utensils, 
  Users, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/context/NotificationContext";

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  showActions?: boolean;
}

export function NotificationItem({ 
  notification, 
  onClick, 
  showActions = false 
}: NotificationItemProps) {
  const { removeNotification } = useNotifications();
  
  // Get createdAt from either property name
  const createdAt = notification.createdAt || notification.created_at;
  
  // Defensive date formatting
  let timeAgo = '';
  if (createdAt) {
    const dateObj = new Date(createdAt);
    if (!isNaN(dateObj.getTime())) {
      timeAgo = formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
    }
  }
  
  // Get the icon based on type
  const getIcon = () => {
    switch (notification.type) {
      case 'feeding':
      case 'reminder':
        return <Utensils className="h-5 w-5 text-primary" />;
      case 'household':
        return <Users className="h-5 w-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'info':
        return <Info className="h-5 w-5 text-primary" />;
      case 'system':
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  // Handle delete notification
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await removeNotification(notification.id);
    } catch (error) {
      console.error(`[NotificationItem] Error removing notification:`, error);
    }
  };
  
  const handleClick = () => {
    if (notification.metadata?.actionUrl) {
      window.location.href = notification.metadata.actionUrl;
    }
    onClick?.();
  };
  
  const content = (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-all rounded-lg",
        !notification.isRead && "bg-primary/5 border-l-2 border-l-primary"
      )}
      onClick={handleClick}
    >
      <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium leading-tight break-words",
            !notification.isRead && "font-semibold"
          )}>
            {notification.title}
          </p>
          {timeAgo && (
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {timeAgo}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 break-words">
          {notification.message}
        </p>
        {!notification.isRead && (
          <div className="flex items-center gap-1 pt-1">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Não lida</span>
          </div>
        )}
      </div>
      {showActions && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Excluir notificação</span>
        </Button>
      )}
    </motion.div>
  );
  
  if (notification.metadata?.actionUrl && !onClick) {
    return (
      <Link href={notification.metadata.actionUrl} className="block">
        {content}
      </Link>
    );
  }
  
  return content;
}
