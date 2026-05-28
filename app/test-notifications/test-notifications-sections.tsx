"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { testNotificationTypes } from "./test-notifications-constants";
import type { TestNotificationsPageViewProps } from "./use-test-notifications-page";

export function TestNotificationsPageMainView({
  idScheduleType,
  idScheduleTitle,
  idScheduleMessage,
  idScheduleDeliverAt,
  idScheduleCatId,
  notificationsLoading,
  notificationsError,
  cats,
  catsLoading,
  isLoading,
  logs,
  intervalMinutes,
  intervalSeconds,
  selectedCatId,
  form,
  isScheduling,
  dispatch,
  handleCreateNotification,
  handleScheduleNotification,
  handleFormChange,
  handleSchedule,
}: TestNotificationsPageViewProps) {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Agendar Notificação (Teste)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSchedule} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor={idScheduleType} className="text-sm font-medium">
                  Tipo
                </label>
                <select
                  id={idScheduleType}
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  className="input input-bordered rounded px-2 py-1"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="feeding">Alimentação</option>
                  <option value="reminder">Lembrete</option>
                  <option value="system">Sistema</option>
                  <option value="info">Informação</option>
                  <option value="warning">Aviso</option>
                  <option value="error">Erro</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor={idScheduleTitle} className="text-sm font-medium">
                  Título
                </label>
                <input
                  id={idScheduleTitle}
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  className="input input-bordered rounded px-2 py-1"
                  required
                  maxLength={100}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={idScheduleMessage} className="text-sm font-medium">
                Mensagem
              </label>
              <textarea
                id={idScheduleMessage}
                name="message"
                value={form.message}
                onChange={handleFormChange}
                className="input input-bordered rounded px-2 py-1"
                required
                maxLength={500}
                rows={2}
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor={idScheduleDeliverAt} className="text-sm font-medium">
                  Data/Hora de Entrega
                </label>
                <input
                  id={idScheduleDeliverAt}
                  type="datetime-local"
                  name="deliverAt"
                  value={form.deliverAt}
                  onChange={handleFormChange}
                  className="input input-bordered rounded px-2 py-1"
                  required
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor={idScheduleCatId} className="text-sm font-medium">
                  Cat ID (opcional)
                </label>
                <input
                  id={idScheduleCatId}
                  name="catId"
                  value={form.catId}
                  onChange={handleFormChange}
                  className="input input-bordered rounded px-2 py-1"
                  placeholder="ID do gato (opcional)"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isScheduling} className="min-w-[140px]">
                {isScheduling ? "Agendando..." : "Agendar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Teste de Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
            <label className="flex items-center gap-2">
              Gato:
              <select
                value={selectedCatId}
                onChange={(e) => dispatch({ type: "SET_SELECTED_CAT", value: e.target.value })}
                className="w-48 border rounded px-2 py-1"
                disabled={catsLoading || cats.length === 0}
              >
                {cats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              Minutos:
              <input
                type="number"
                min={0}
                value={intervalMinutes}
                onChange={(e) =>
                  dispatch({ type: "SET_INTERVAL_MINUTES", value: Number(e.target.value) })
                }
                className="w-16 border rounded px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2">
              Segundos:
              <input
                type="number"
                min={0}
                max={59}
                value={intervalSeconds}
                onChange={(e) =>
                  dispatch({ type: "SET_INTERVAL_SECONDS", value: Number(e.target.value) })
                }
                className="w-16 border rounded px-2 py-1"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testNotificationTypes.map((type) => (
              <div key={type.type} className="flex flex-col gap-2">
                <Button
                  onClick={() => handleCreateNotification(type.type, type.title, type.message)}
                  disabled={isLoading || notificationsLoading}
                  className="w-full"
                >
                  {isLoading ? "Criando..." : type.description}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleScheduleNotification(type.type, type.title, type.message)}
                  disabled={isLoading || notificationsLoading}
                  className="w-full"
                >
                  {isLoading ? "Agendando..." : `Agendar (${type.description})`}
                </Button>
              </div>
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
              {logs.map((log) => (
                <div
                  key={`log-${log.timestamp.getTime()}-${log.message.slice(0, 20)}`}
                  className={cn(
                    "p-4 rounded-lg",
                    log.status === "error" && "bg-destructive/10",
                    log.status === "success" && "bg-emerald-500/10",
                    log.status === "info" && "bg-accent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(log.timestamp, "dd/MM/yyyy HH:mm:ss")}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        log.status === "error" && "text-destructive",
                        log.status === "success" && "text-emerald-500",
                        log.status === "info" && "text-primary"
                      )}
                    >
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
