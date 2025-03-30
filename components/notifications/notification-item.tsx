"use client";

import { Notification } from "@/lib/types/notification";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  Bell, 
  Utensils, 
  Users, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Trash2,
  XCircle
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
  const { id, title, message, type, isRead, createdAt, actionUrl } = notification;
  
  // Format the time
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  // Get the icon based on type
  const getIcon = () => {
    switch (type) {
      case 'feeding':
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
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    removeNotification(id);
  };
  
  const content = (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-accent cursor-pointer rounded-lg transition-colors",
        !isRead && "bg-accent/50"
      )}
      onClick={onClick}
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className={cn("text-sm font-medium", !isRead && "font-semibold")}>
            {title}
          </h4>
          {showActions && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-destructive" 
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!isRead && (
        <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />
      )}
    </div>
  );
  
  if (actionUrl) {
    return (
      <Link href={actionUrl} className="block">
        {content}
      </Link>
    );
  }
  
  return content;
}
