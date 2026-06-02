import { Types } from "mongoose";
import Notification, {
  type INotification,
  type NotificationEventType,
} from "../models/Notification.js";

type NotificationEntityType = "task" | "user" | "leave";

export type CreateNotificationInput = {
  recipientId: string;
  actorId?: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export type ListNotificationsInput = {
  page: number;
  limit: number;
  unreadOnly?: boolean;
};

const normalizeNotification = (item: INotification) => ({
  notification_id: String(item._id),
  recipient_id: String(item.recipient_id),
  actor_id: item.actor_id ? String(item.actor_id) : undefined,
  event_type: item.event_type,
  title: item.title,
  message: item.message,
  entity_type: item.entity_type,
  entity_id: item.entity_id ? String(item.entity_id) : undefined,
  metadata: item.metadata ?? {},
  is_read: item.is_read,
  read_at: item.read_at,
  created_at: item.created_at,
});

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);

// ── Deduplication ────────────────────────────────────────────────────────────
// Block identical notifications (same recipient + event + entity) created within
// a short window to prevent duplicates caused by rapid successive saves or
// double-click race conditions.
const DEDUPE_WINDOW_MS = 10_000; // 10 seconds

const isDuplicateNotification = async (
  recipientId: string,
  eventType: NotificationEventType,
  entityId?: string,
): Promise<boolean> => {
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const exists = await Notification.exists({
    recipient_id: toObjectId(recipientId),
    event_type: eventType,
    entity_id: entityId ? toObjectId(entityId) : { $exists: false },
    created_at: { $gte: since },
  });
  return !!exists;
};

export const createNotification = async (
  input: CreateNotificationInput,
): Promise<ReturnType<typeof normalizeNotification> | null> => {
  const isDuplicate = await isDuplicateNotification(
    input.recipientId,
    input.eventType,
    input.entityId,
  );
  if (isDuplicate) {
    return null;
  }

  const created = await Notification.create({
    recipient_id: toObjectId(input.recipientId),
    actor_id: input.actorId ? toObjectId(input.actorId) : undefined,
    event_type: input.eventType,
    title: input.title,
    message: input.message,
    entity_type: input.entityType,
    entity_id: input.entityId ? toObjectId(input.entityId) : undefined,
    metadata: input.metadata,
  });

  return normalizeNotification(created);
};

export const createNotificationsForRecipients = async (
  recipientIds: string[],
  input: Omit<CreateNotificationInput, "recipientId">,
) => {
  const uniqueRecipientIds = [
    ...new Set(
      recipientIds.map((id) => id.trim()).filter((id) => id.length > 0),
    ),
  ];

  if (uniqueRecipientIds.length === 0) {
    return [] as ReturnType<typeof normalizeNotification>[];
  }

  const filteredRecipientIds = input.actorId
    ? uniqueRecipientIds.filter((id) => id !== input.actorId)
    : uniqueRecipientIds;

  if (filteredRecipientIds.length === 0) {
    return [] as ReturnType<typeof normalizeNotification>[];
  }

  // Deduplicate: remove recipients who already received an identical notification
  // within the last DEDUPE_WINDOW_MS to prevent duplicate entries.
  const dedupeChecks = await Promise.all(
    filteredRecipientIds.map((id) =>
      isDuplicateNotification(id, input.eventType, input.entityId),
    ),
  );
  const toNotifyIds = filteredRecipientIds.filter((_, i) => !dedupeChecks[i]);

  if (toNotifyIds.length === 0) {
    return [] as ReturnType<typeof normalizeNotification>[];
  }

  const docs = await Notification.insertMany(
    toNotifyIds.map((recipientId) => ({
      recipient_id: toObjectId(recipientId),
      actor_id: input.actorId ? toObjectId(input.actorId) : undefined,
      event_type: input.eventType,
      title: input.title,
      message: input.message,
      entity_type: input.entityType,
      entity_id: input.entityId ? toObjectId(input.entityId) : undefined,
      metadata: input.metadata,
    })),
  );

  return docs.map((doc) => normalizeNotification(doc));
};

export const listNotifications = async (
  userId: string,
  input: ListNotificationsInput,
) => {
  const query = {
    recipient_id: toObjectId(userId),
    ...(input.unreadOnly ? { is_read: false } : {}),
  };

  const skip = (input.page - 1) * input.limit;

  const [rows, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(input.limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({
      recipient_id: toObjectId(userId),
      is_read: false,
    }),
  ]);

  return {
    items: rows.map((row) => ({
      notification_id: String(row._id),
      recipient_id: String(row.recipient_id),
      actor_id: row.actor_id ? String(row.actor_id) : undefined,
      event_type: row.event_type,
      title: row.title,
      message: row.message,
      entity_type: row.entity_type,
      entity_id: row.entity_id ? String(row.entity_id) : undefined,
      metadata: row.metadata ?? {},
      is_read: row.is_read,
      read_at: row.read_at,
      created_at: row.created_at,
    })),
    total,
    unread_count: unreadCount,
    page: input.page,
    limit: input.limit,
    total_pages: Math.max(1, Math.ceil(total / input.limit)),
  };
};

export const markNotificationAsRead = async (
  userId: string,
  notificationId: string,
) => {
  const updated = await Notification.findOneAndUpdate(
    {
      _id: toObjectId(notificationId),
      recipient_id: toObjectId(userId),
    },
    {
      $set: {
        is_read: true,
        read_at: new Date(),
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new Error("Notification not found.");
  }

  return normalizeNotification(updated);
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const result = await Notification.updateMany(
    {
      recipient_id: toObjectId(userId),
      is_read: false,
    },
    {
      $set: {
        is_read: true,
        read_at: new Date(),
      },
    },
  );

  return {
    updated_count: result.modifiedCount,
  };
};
