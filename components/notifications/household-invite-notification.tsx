"use client";

import { useState } from "react";
import { Notification } from "@/lib/types/notification";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Home, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/context/NotificationContext";
import { useUserContext } from "@/lib/context/UserContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface HouseholdInviteNotificationProps {
  notification: Notification;
  onClick?: () => void;
}

export function HouseholdInviteNotification({ 
  notification, 
  onClick 
}: HouseholdInviteNotificationProps) {
  const { refreshNotifications } = useNotifications();
  const { refreshUser } = useUserContext();
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Get createdAt
  const createdAt = notification.createdAt;
  
  // Defensive date formatting
  let timeAgo = '';
  if (createdAt) {
    const dateObj = new Date(createdAt);
    if (!isNaN(dateObj.getTime())) {
      timeAgo = formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
    }
  }

  // Check if already handled
  const metadata = notification.metadata as any;
  const status = metadata?.status;
  const isHandled = status === 'accepted' || status === 'rejected' || status === 'expired';
  
  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsAccepting(true);
    try {
      const response = await fetch(
        `/api/v2/households/invites/${notification.id}/accept`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao aceitar convite');
      }
      
      toast.success('Convite aceito com sucesso!');
      
      // Refresh user context to load the new household membership
      await refreshUser();
      
      // Refresh notifications to update the notification status
      await refreshNotifications();
      
      // Small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Redirect to households page
      router.push('/households');
      
      // Force a router refresh to reload the page data
      router.refresh();
      
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao aceitar convite');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsRejecting(true);
    try {
      const response = await fetch(
        `/api/v2/households/invites/${notification.id}/reject`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao rejeitar convite');
      }
      
      toast.success('Convite rejeitado');
      
      // Refresh notifications
      await refreshNotifications();
      
    } catch (error) {
      console.error('Error rejecting invite:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao rejeitar convite');
    } finally {
      setIsRejecting(false);
    }
  };

  const isProcessing = isAccepting || isRejecting;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex flex-col gap-3 p-4 rounded-lg border",
        !notification.isRead && "bg-primary/5 border-primary/30",
        notification.isRead && "bg-card border-border",
        isProcessing && "opacity-70 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <Home className="h-5 w-5 text-emerald-500" />
        </div>
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
          <p className="text-sm text-muted-foreground break-words">
            {notification.message}
          </p>
          
          {/* Status badges */}
          {status === 'accepted' && (
            <div className="flex items-center gap-1 pt-1">
              <Check className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-600">Convite aceito</span>
            </div>
          )}
          {status === 'rejected' && (
            <div className="flex items-center gap-1 pt-1">
              <X className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-600">Convite rejeitado</span>
            </div>
          )}
          {status === 'expired' && (
            <div className="flex items-center gap-1 pt-1">
              <span className="text-xs text-muted-foreground">Convite expirado</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons - only show if not handled */}
      {!isHandled && !notification.isRead && (
        <div className="flex items-center gap-2 ml-8">
          <Button
            onClick={handleAccept}
            disabled={isProcessing}
            size="sm"
            className="flex-1"
          >
            {isAccepting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-2" />
                Aceitando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Aceitar
              </>
            )}
          </Button>
          <Button
            onClick={handleReject}
            disabled={isProcessing}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            {isRejecting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-2" />
                Rejeitando...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Rejeitar
              </>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

