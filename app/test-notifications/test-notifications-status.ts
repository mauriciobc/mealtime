import type { LogEntry } from "./test-notifications-reducer";

export function getStatusColor(status: LogEntry["status"]) {
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
}

export function getStatusText(status: LogEntry["status"]) {
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
}
