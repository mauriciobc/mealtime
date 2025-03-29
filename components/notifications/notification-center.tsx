"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, Clock, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/lib/context/AppContext";
import { toast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface para as notificações
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: "feeding" | "reminder" | "system";
  icon?: string;
  timestamp: string | Date;
  isRead: boolean;
  data?: {
    scheduleId?: number;
    catId?: number;
    userId?: number;
    [key: string]: any;
  };
}

export function NotificationCenter() {
  const { state, dispatch } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const notifications = state.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });

      // Atualizar o estado localmente
      if (dispatch) {
        dispatch({
          type: "MARK_ALL_NOTIFICATIONS_READ",
        });
      }

      toast({
        description: "Todas as notificações foram marcadas como lidas",
      });
    } catch (error) {
      console.error("Erro ao marcar notificações como lidas:", error);
    }
  };

  // Marcar uma notificação como lida
  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });

      // Atualizar o estado localmente
      if (dispatch) {
        dispatch({
          type: "MARK_NOTIFICATION_READ",
          payload: { id },
        });
      }
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Remover uma notificação
  const removeNotification = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      // Atualizar o estado localmente
      if (dispatch) {
        dispatch({
          type: "REMOVE_NOTIFICATION",
          payload: { id },
        });
      }
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
    }
  };

  // Obter o ícone baseado no tipo de notificação
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "feeding":
        return <Clock className="h-4 w-4 text-primary" />;
      case "reminder":
        return <Calendar className="h-4 w-4 text-amber-500" />;
      case "system":
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-medium">Notificações</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <ul className="divide-y">
              <AnimatePresence initial={false}>
                {notifications.map((notification) => (
                  <motion.li
                    key={notification.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-3 hover:bg-muted/50 relative ${
                      !notification.isRead ? "bg-muted/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(
                            typeof notification.timestamp === 'string'
                              ? new Date(notification.timestamp)
                              : notification.timestamp instanceof Date 
                                ? notification.timestamp 
                                : new Date(),
                            {
                              addSuffix: true,
                              locale: ptBR,
                            }
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-1">
                        {!notification.isRead && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => removeNotification(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Link 
            href="/notifications" 
            className="flex items-center justify-between w-full p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Ver todas as notificações
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
} 