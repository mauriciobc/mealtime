"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/lib/context/NotificationContext";
import { createNotification } from "@/lib/services/notificationService";
import { useUserContext } from "@/lib/context/UserContext";
import { toast } from "sonner";
import { NotificationType, CreateNotificationPayload } from "@/lib/types/notification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LogEntry {
  timestamp: Date;
  type: NotificationType;
  title: string;
  message: string;
  status: "success" | "error" | "info";
  details?: {
    payload?: any;
    response?: any;
    error?: any;
    context?: any;
    errorObject?: any;
  };
}

export default function TestNotificationsPage() {
  console.log("[TestNotificationsPage] Rendering...");
  const { 
    notifications, 
    isLoading: notificationsLoading, 
    error: notificationsError,
    refreshNotifications,
    unreadCount,
    isLoading: contextIsLoading,
    page,
    totalPages,
    hasMore
  } = useNotifications();
  const { state: userState } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  console.log("[TestNotificationsPage] Context State:", {
    notificationsCount: notifications.length,
    unreadCount,
    contextIsLoading,
    contextError: notificationsError,
    page,
    totalPages,
    hasMore,
    componentIsLoading: isLoading
  });
  console.log("[TestNotificationsPage] User State:", userState);

  const addLog = useCallback((log: LogEntry) => {
    console.log("[TestNotificationsPage] Adding log entry:", log);
    setLogs(prevLogs => [log, ...prevLogs]);
  }, []);

  const handleCreateNotification = useCallback(async (type: NotificationType, title: string, message: string) => {
    console.log(`[TestNotificationsPage] handleCreateNotification called with: type=${type}, title=${title}, message=${message}`);
    if (!type || !title || !message) {
      const errorMsg = "Todos os campos são obrigatórios";
      console.error(`[TestNotificationsPage] Validation failed: ${errorMsg}`);
      toast.error(errorMsg);
      addLog({
        timestamp: new Date(),
        type: type || 'info', // Use provided type or default
        title: title || 'Validation Error',
        message: message || 'Missing fields',
        status: "error",
        details: {
          error: errorMsg,
          context: { type, title, message }
        }
      });
      return;
    }

    if (!userState.currentUser?.id) {
      const errorMsg = "Usuário não autenticado";
      console.error(`[TestNotificationsPage] Auth failed: ${errorMsg}`);
      toast.error(errorMsg);
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: {
          error: errorMsg,
          context: { currentUser: userState.currentUser }
        }
      });
      return;
    }

    console.log("[TestNotificationsPage] Setting loading state to true");
    setIsLoading(true);

    try {
      const payload: Omit<CreateNotificationPayload, 'userId' | 'householdId'> = {
        type,
        title,
        message,
        metadata: { 
            // Include any relevant metadata if needed, e.g., action_url
            // icon: getIconForType(type) // Example if you have such a function
        }
      };
      console.log("[TestNotificationsPage] Calling createNotification service with simplified payload:", payload);

      const response = await createNotification(payload);
      console.log("[TestNotificationsPage] createNotification service responded:", response);
      
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "success",
        details: {
          payload,
          response
        }
      });

      console.log("[TestNotificationsPage] Notification created successfully. Calling refreshNotifications.");
      toast.success("Notificação criada com sucesso!");
      await refreshNotifications();
      console.log("[TestNotificationsPage] refreshNotifications completed.");
      
    } catch (error) {
      console.error("[TestNotificationsPage] Error creating notification:", error);
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido ao criar notificação";
      
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: {
          error: errorMsg,
          errorObject: error,
          context: {
            currentUser: userState.currentUser,
            payload: { type, title, message }
          }
        }
      });
      
      toast.error(errorMsg);
    } finally {
      console.log("[TestNotificationsPage] Setting loading state to false");
      setIsLoading(false);
    }
  }, [userState.currentUser, addLog, refreshNotifications]);

  const notificationTypes = [
    {
      type: "feeding" as NotificationType,
      title: "Hora de Alimentar",
      message: "É hora de alimentar o gato!",
      description: "Notificação de alimentação programada"
    },
    {
      type: "reminder" as NotificationType,
      title: "Lembrete de Alimentação",
      message: "Não se esqueça de alimentar o gato!",
      description: "Lembrete de alimentação pendente"
    },
    {
      type: "household" as NotificationType,
      title: "Atualização da Casa",
      message: "Novo membro adicionado à casa",
      description: "Notificação relacionada a membros da casa"
    },
    {
      type: "system" as NotificationType,
      title: "Atualização do Sistema",
      message: "Nova versão disponível",
      description: "Notificação do sistema"
    },
    {
      type: "info" as NotificationType,
      title: "Informação",
      message: "Informação importante sobre seu gato",
      description: "Notificação informativa"
    },
    {
      type: "warning" as NotificationType,
      title: "Aviso",
      message: "Atenção: Gato não alimentado",
      description: "Notificação de aviso"
    },
    {
      type: "error" as NotificationType,
      title: "Erro",
      message: "Erro ao processar alimentação",
      description: "Notificação de erro"
    }
  ];

  const getStatusColor = (status: LogEntry["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-destructive";
      case "info":
        return "text-blue-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusText = (status: LogEntry["status"]) => {
    switch (status) {
      case "success":
        return "Sucesso";
      case "error":
        return "Erro";
      case "info":
        return "Info";
      default:
        return "Desconhecido";
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notificationTypes.map((type) => (
              <Button
                key={type.type}
                onClick={() => handleCreateNotification(type.type, type.title, type.message)}
                disabled={isLoading || notificationsLoading}
                className="w-full"
              >
                {isLoading ? "Criando..." : type.description}
              </Button>
            ))}
          </div>
          {notificationsError && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
              {notificationsError}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg",
                    log.status === "error" && "bg-destructive/10",
                    log.status === "success" && "bg-emerald-500/10",
                    log.status === "info" && "bg-accent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(log.timestamp, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </span>
                    <span className={cn(
                      "text-xs font-medium",
                      log.status === "error" && "text-destructive",
                      log.status === "success" && "text-emerald-500",
                      log.status === "info" && "text-primary"
                    )}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">{log.title}</h4>
                    <p className="text-xs text-muted-foreground">{log.message}</p>
                    {log.details && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 