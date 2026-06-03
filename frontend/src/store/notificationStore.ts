// frontend/src/store/notificationStore.ts
import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import type { NotificationItem } from '../types/notification';

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  hasDeadlineAlert: boolean;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  fetchLatest: () => Promise<void>;
  fetchPage: (page: number, limit?: number) => Promise<void>;
  prependNotification: (item: NotificationItem) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleOpen: () => void;
  setOpen: (isOpen: boolean) => void;
}

const hasDeadlineAlert = (items: NotificationItem[]): boolean =>
  items.some(
    (item) =>
      !item.is_read &&
      (item.event_type === 'task_due_today' || item.event_type === 'task_overdue'),
  );

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  hasDeadlineAlert: false,
  page: 1,
  totalPages: 1,
  loading: false,
  error: null,
  isOpen: false,

  fetchLatest: async () => {
    set({ loading: true, error: null });
    try {
      const data = await notificationService.listNotifications({
        page: 1,
        limit: 20,
      });
      set({
        items: data.items,
        // Always use the authoritative server count — never derive from local
        // items slice so the bell badge matches the notifications page.
        unreadCount: data.unread_count,
        hasDeadlineAlert: hasDeadlineAlert(data.items),
        page: data.page,
        totalPages: data.total_pages,
      });
    } catch {
      set({ error: 'Failed to load notifications.' });
    } finally {
      set({ loading: false });
    }
  },

  fetchPage: async (page, limit = 20) => {
    set({ loading: true, error: null });
    try {
      const data = await notificationService.listNotifications({ page, limit });
      set({
        items: data.items,
        unreadCount: data.unread_count,
        hasDeadlineAlert: hasDeadlineAlert(data.items),
        page: data.page,
        totalPages: data.total_pages,
      });
    } catch {
      set({ error: 'Failed to load notifications.' });
    } finally {
      set({ loading: false });
    }
  },

  prependNotification: (item) => {
    const state = get();
    const exists = state.items.some(
      (row) => row.notification_id === item.notification_id,
    );
    if (exists) return;

    const newItems = [item, ...state.items].slice(0, 20);
    set({
      items: newItems,
      unreadCount: state.unreadCount + (item.is_read ? 0 : 1),
      hasDeadlineAlert: hasDeadlineAlert(newItems),
    });
  },

  markAsRead: async (notificationId) => {
    const state = get();
    const target = state.items.find(
      (item) => item.notification_id === notificationId,
    );
    if (!target || target.is_read) return;

    const updatedItems = state.items.map((item) =>
      item.notification_id === notificationId
        ? { ...item, is_read: true, read_at: new Date().toISOString() }
        : item,
    );
    set({
      items: updatedItems,
      unreadCount: Math.max(0, state.unreadCount - 1),
      hasDeadlineAlert: hasDeadlineAlert(updatedItems),
    });

    try {
      await notificationService.markAsRead(notificationId);
    } catch {
      // Revert optimistic update on failure
      await get().fetchLatest();
    }
  },

  markAllAsRead: async () => {
    const state = get();
    if (state.unreadCount === 0) return;

    const updatedItems = state.items.map((item) => ({
      ...item,
      is_read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    }));
    set({
      items: updatedItems,
      unreadCount: 0,
      hasDeadlineAlert: false,
    });

    try {
      await notificationService.markAllAsRead();
    } catch {
      // Revert optimistic update on failure
      await get().fetchLatest();
    }
  },

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
}));