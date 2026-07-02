import type { CreateNotificationPayload, NotificationType } from '@/lib/types/notification';

/** Shape for Prisma notifications.create / createMany */
export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: CreateNotificationPayload['metadata'];
  created_at: string;
  updated_at: string;
};

export type { CreateNotificationPayload };

const VALID_TYPES: NotificationType[] = [
  'feeding',
  'reminder',
  'household',
  'household_invite',
  'system',
  'info',
  'warning',
  'error',
];

export function isValidNotificationType(type: string): type is NotificationType {
  return (VALID_TYPES as string[]).includes(type);
}

export function assertNotificationPayload(payload: CreateNotificationPayload): void {
  if (!payload.title?.trim()) throw new Error('Notification title is required');
  if (!payload.message?.trim()) throw new Error('Notification message is required');
  if (!isValidNotificationType(payload.type)) throw new Error(`Invalid notification type: ${payload.type}`);
}

export function buildDuplicateFeedingWarning(params: {
  id: string;
  userId: string;
  catId: string;
  catName: string;
  householdId: string;
  now?: string;
}): NotificationRow {
  const now = params.now ?? new Date().toISOString();
  return {
    id: params.id,
    user_id: params.userId,
    title: 'Alimentação duplicada',
    message: `O gato ${params.catName} já foi alimentado recentemente.`,
    type: 'warning',
    metadata: {
      catId: params.catId,
      userId: params.userId,
      householdId: params.householdId,
      actionUrl: `/cats/${params.catId}`,
      duplicate: true,
    },
    created_at: now,
    updated_at: now,
  };
}

export function buildFeedingRegisteredNotification(params: {
  id: string;
  userId: string;
  catId: string;
  feedingLogId: string;
  householdId: string;
  now?: string;
}): NotificationRow {
  const now = params.now ?? new Date().toISOString();
  return {
    id: params.id,
    user_id: params.userId,
    title: 'Alimentação registrada para o gato',
    message: 'O gato foi alimentado com sucesso.',
    type: 'feeding',
    metadata: {
      catId: params.catId,
      userId: params.userId,
      feedingLogId: params.feedingLogId,
      householdId: params.householdId,
    },
    created_at: now,
    updated_at: now,
  };
}

export function buildHouseholdFeedingBroadcast(params: {
  id: string;
  recipientUserId: string;
  catId: string;
  catName: string;
  feederId: string;
  feederName: string | null | undefined;
  fedAt: string;
  now?: string;
}): NotificationRow {
  const now = params.now ?? new Date().toISOString();
  return {
    id: params.id,
    user_id: params.recipientUserId,
    title: 'Alimentação registrada',
    message: `Seu gato ${params.catName} foi alimentado por ${params.feederName || 'alguém'}.`,
    type: 'feeding',
    metadata: {
      catId: params.catId,
      catName: params.catName,
      feederId: params.feederId,
      feederName: params.feederName,
      fedAt: params.fedAt,
    },
    created_at: now,
    updated_at: now,
  };
}

export function buildHouseholdJoinNotifications(params: {
  householdId: string;
  householdName: string;
  joiningUserId: string;
  joiningUserName: string | null | undefined;
  otherMemberIds: string[];
  idFactory: () => string;
  now?: string;
}): NotificationRow[] {
  const now = params.now ?? new Date().toISOString();
  const displayName = params.joiningUserName || 'Um usuário';

  return params.otherMemberIds.map((memberId) => ({
    id: params.idFactory(),
    user_id: memberId,
    title: 'Novo membro na residência',
    message: `${displayName} entrou na residência ${params.householdName}`,
    type: 'household' as const,
    metadata: {
      householdId: params.householdId,
      actionUrl: `/households/${params.householdId}`,
    },
    created_at: now,
    updated_at: now,
  }));
}

export function buildScheduleUpdateNotification(params: {
  catId: string;
  catName: string;
  scheduleId: string;
  updatedFields: string[];
}): CreateNotificationPayload {
  return {
    title: 'Horário de alimentação atualizado',
    message: `O agendamento do gato ${params.catName} foi atualizado.`,
    type: 'system',
    metadata: {
      catId: params.catId,
      scheduleId: params.scheduleId,
      updatedFields: params.updatedFields,
    },
  };
}
