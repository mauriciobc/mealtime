import type { NotificationType } from "@/lib/types/notification";

export const testNotificationTypes = [
  {
    type: "feeding" as NotificationType,
    title: "Hora de Alimentar",
    message: "É hora de alimentar o gato!",
    description: "Notificação de alimentação programada",
  },
  {
    type: "reminder" as NotificationType,
    title: "Lembrete de Alimentação",
    message: "Não se esqueça de alimentar o gato!",
    description: "Lembrete de alimentação pendente",
  },
  {
    type: "household" as NotificationType,
    title: "Atualização da Casa",
    message: "Novo membro adicionado à casa",
    description: "Notificação relacionada a membros da casa",
  },
  {
    type: "system" as NotificationType,
    title: "Atualização do Sistema",
    message: "Nova versão disponível",
    description: "Notificação do sistema",
  },
  {
    type: "info" as NotificationType,
    title: "Informação",
    message: "Informação importante sobre seu gato",
    description: "Notificação informativa",
  },
  {
    type: "warning" as NotificationType,
    title: "Aviso",
    message: "Atenção: Gato não alimentado",
    description: "Notificação de aviso",
  },
  {
    type: "error" as NotificationType,
    title: "Erro",
    message: "Erro ao processar alimentação",
    description: "Notificação de erro",
  },
];
