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
  const { addNotification, notifications } = useNotifications();
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
      toast.error("Dados da notificação inválidos");
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
            message
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
          userId: appState.currentUser?.id
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
            isAuthenticated: true
          }
        }
      });

      const notification = await createNotification({
        title,
        message,
        type,
        userId: appState.currentUser.id
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
      toast.error("Erro ao criar notificação");

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
            isAuthenticated: true
          }
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, notifications, appState.currentUser?.id, addLog]);

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
    <div className="flex h-screen">
      {/* Área principal */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Teste de Notificações</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notificationTypes.map((notification) => (
            <Card key={notification.type}>
              <CardHeader>
                <CardTitle>{notification.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {notification.description}
                </p>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateNotification(
                      notification.type,
                      notification.title,
                      notification.message
                    );
                  }}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Criando..." : "Criar Notificação"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Barra lateral de logs */}
      <div className="w-96 border-l bg-muted/50">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Logs de Notificações</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-4">
            {logs.map((log, index) => (
              <Card key={index} className={`${
                log.status === "error" ? "border-destructive" : 
                log.status === "success" ? "border-green-500/50" : 
                "border-blue-500/50"
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-medium ${getStatusColor(log.status)}`}>
                      {getStatusText(log.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(log.timestamp, "HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{log.title}</p>
                    <p className="text-xs text-muted-foreground">{log.message}</p>
                    {log.details && (
                      <div className="mt-2 text-xs">
                        {log.details.error && (
                          <div className="text-destructive">
                            <p className="font-medium">Erro:</p>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.details.error, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.details.response && (
                          <div className="text-green-600">
                            <p className="font-medium">Resposta:</p>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.details.response, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.details.context && (
                          <div className="text-blue-600">
                            <p className="font-medium">Contexto:</p>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.details.context, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.details.payload && (
                          <div className="text-muted-foreground">
                            <p className="font-medium">Payload:</p>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.details.payload, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nenhum log disponível
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 