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
import { useNotifications } from "@/lib/context/NotificationContext";
import { toast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Notification, NotificationType } from "@/lib/types/notification";
import { NotificationItem } from "./notification-item";

export function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification 
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // Marcar todas as notificações como lidas
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        description: "Todas as notificações foram marcadas como lidas",
      });
    } catch (error) {
      console.error("Erro ao marcar notificações como lidas:", error);
    }
  };

  // Marcar uma notificação como lida
  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Remover uma notificação
  const handleRemoveNotification = async (id: number) => {
    try {
      await removeNotification(id);
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-medium">Notificações</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="relative group hover:bg-accent/50 rounded-lg p-2 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <NotificationItem 
                        notification={notification} 
                        onClick={() => setIsOpen(false)}
                      />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:text-primary"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={() => handleRemoveNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button variant="ghost" className="w-full justify-center hover:text-primary" asChild>
            <Link href="/notifications">Ver todas as notificações</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 