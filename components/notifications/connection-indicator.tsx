"use client";

import { ConnectionStatus } from "@/lib/types/notification";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig = {
  connected: {
    icon: Wifi,
    label: "Conectado",
    variant: "default" as const,
    color: "text-green-500",
    tooltip: "Conectado e sincronizando em tempo real",
  },
  reconnecting: {
    icon: Loader2,
    label: "Reconectando",
    variant: "secondary" as const,
    color: "text-yellow-500",
    tooltip: "Tentando reconectar...",
  },
  error: {
    icon: AlertCircle,
    label: "Erro",
    variant: "destructive" as const,
    color: "text-red-500",
    tooltip: "Erro de conexão. Tentando novamente...",
  },
  disconnected: {
    icon: WifiOff,
    label: "Offline",
    variant: "outline" as const,
    color: "text-gray-500",
    tooltip: "Sem conexão. As notificações serão sincronizadas quando voltar online.",
  },
};

export function ConnectionIndicator({ status, className }: ConnectionIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant} 
            className={cn("flex items-center gap-1.5", className)}
          >
            {status === 'reconnecting' ? (
              <Icon className={cn("h-3 w-3 animate-spin", config.color)} />
            ) : (
              <Icon className={cn("h-3 w-3", config.color)} />
            )}
            <span className="hidden sm:inline">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
