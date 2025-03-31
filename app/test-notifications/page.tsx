"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/lib/context/NotificationContext";
import { createNotification } from "@/lib/services/notificationService";
import { useAppContext } from "@/lib/context/AppContext";
import { toast } from "sonner";
import { NotificationType } from "@/lib/types/notification";
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
  };
}

export default function TestNotificationsPage() {
  const { 
    addNotification, 
    notifications, 
    isLoading: notificationsLoading, 
    error: notificationsError 
  } = useNotifications();
  const { state: appState } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((entry: LogEntry) => {
    try {
      setLogs(prev => [entry, ...prev]);
    } catch (error) {
      console.error("Erro ao adicionar log:", error);
    }
  }, []);

  const handleCreateNotification = useCallback(async (type: NotificationType, title: string, message: string) => {
    if (!type || !title || !message) {
      const missingFields = [];
      if (!type) missingFields.push('type');
      if (!title) missingFields.push('title');
      if (!message) missingFields.push('message');

      toast.error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      addLog({
        timestamp: new Date(),
        type: type || "info",
        title: title || "Sem título",
        message: message || "Sem mensagem",
        status: "error",
        details: {
          error: "Dados da notificação inválidos",
          context: {
            type,
            title,
            message,
            missingFields
          }
        }
      });
      return;
    }

    // Log inicial
    addLog({
      timestamp: new Date(),
      type,
      title,
      message,
      status: "info",
      details: {
        payload: {
          type,
          title,
          message,
          userId: appState.currentUser?.id,
          householdId: appState.currentUser?.householdId
        }
      }
    });

    if (!appState.currentUser?.id) {
      toast.error("Usuário não autenticado");
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: {
          error: "Usuário não autenticado",
          context: {
            currentUser: appState.currentUser
          }
        }
      });
      return;
    }

    if (!appState.currentUser?.householdId) {
      toast.error("Usuário não pertence a nenhuma casa");
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: {
          error: "Usuário não pertence a nenhuma casa",
          context: {
            currentUser: appState.currentUser
          }
        }
      });
      return;
    }

    setIsLoading(true);
    try {
      // Log antes da chamada à API
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "info",
        details: {
          context: {
            currentNotifications: notifications?.length || 0,
            isAuthenticated: true,
            userId: appState.currentUser.id,
            householdId: appState.currentUser.householdId
          }
        }
      });

      const notification = await createNotification({
        title,
        message,
        type,
        userId: appState.currentUser.id,
        householdId: appState.currentUser.householdId
      });

      if (!notification) {
        throw new Error("Falha ao criar notificação: resposta vazia");
      }

      // Log da resposta da API
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "info",
        details: {
          response: notification
        }
      });

      addNotification(notification);
      toast.success("Notificação criada com sucesso!");

      // Log de sucesso com contexto atualizado
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "success",
        details: {
          context: {
            updatedNotifications: (notifications?.length || 0) + 1,
            notificationId: notification.id
          }
        }
      });
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar notificação");

      // Log detalhado do erro
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error,
          context: {
            currentNotifications: notifications?.length || 0,
            isAuthenticated: true,
            userId: appState.currentUser.id,
            householdId: appState.currentUser.householdId
          }
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, notifications, appState.currentUser?.id, appState.currentUser?.householdId, addLog]);

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