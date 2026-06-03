import api from "./api";
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationPreferences,
} from "../types/notification";

type ListNotificationsInput = {
  page?: number;
  limit?: number;
  unread_only?: boolean;
};

export const notificationService = {
  listNotifications: async (
    query?: ListNotificationsInput,
  ): Promise<NotificationListResponse> => {
    const response = await api.get<NotificationListResponse>("/notifications", {
      params: {
        page: query?.page ?? 1,
        limit: query?.limit ?? 20,
        unread_only: query?.unread_only,
      },
      headers: {},
    });

    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<NotificationItem> => {
    const response = await api.patch<NotificationItem>(
      `/notifications/${notificationId}/read`,
    );
    return response.data;
  },

  markAllAsRead: async (): Promise<{ updated_count: number }> => {
    const response = await api.patch<{ updated_count: number }>(
      "/notifications/read-all",
    );
    return response.data;
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get<NotificationPreferences>(
      "/notifications/preferences",
    );
    return response.data;
  },

  updatePreferences: async (
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> => {
    const response = await api.patch<NotificationPreferences>(
      "/notifications/preferences",
      updates,
    );
    return response.data;
  },
};