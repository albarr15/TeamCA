// frontend/src/features/notifications/NotificationsPage.tsx
import React, { useEffect } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatNotificationTimestamp } from '../../utils/dateUtils';
import { ActivityListItemSkeleton } from '../../components/ui/Skeleton';
import {
  getNotificationHref,
  getNotificationIcon,
  getNotificationIconStyle,
  getQuickActionLabel,
  groupNotificationsByDate,
  renderNotificationDetail,
} from '../../utils/notificationUtils';

export default function NotificationsPage() {
  const pageSize = 8;

  const items = useNotificationStore((state) => state.items);
  const loading = useNotificationStore((state) => state.loading);
  const error = useNotificationStore((state) => state.error);
  const page = useNotificationStore((state) => state.page);
  const totalPages = useNotificationStore((state) => state.totalPages);
  const fetchPage = useNotificationStore((state) => state.fetchPage);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  useEffect(() => {
    void fetchPage(1, pageSize);
  }, [fetchPage]);

  // Auto-mark all visible notifications as read once the initial load completes.
  useEffect(() => {
    if (loading) return;
    if (items.some((item) => !item.is_read)) {
      void markAllAsRead();
    }
  }, [items, loading, markAllAsRead]);

  const handleNotificationClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    notificationId: string,
    href: string,
  ) => {
    event.preventDefault();
    await markAsRead(notificationId);
    window.location.assign(href);
  };

  const handleQuickAction = async (
    event: React.MouseEvent<HTMLButtonElement>,
    notificationId: string,
    href: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    await markAsRead(notificationId);
    window.location.assign(href);
  };

  const groupedItems = groupNotificationsByDate(items);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">See recent activity updates.</p>
        </div>

        <button
          type="button"
          onClick={() => void markAllAsRead()}
          disabled={loading || items.every((i) => i.is_read)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark all as read
        </button>
      </div>

      <section className="rounded-xl p-3">
        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <ActivityListItemSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {/* Error state */}
        {!loading && error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void fetchPage(1, pageSize)}
              className="mt-2 text-xs font-medium text-red-700 underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        ) : null}

        {/* Empty state */}
        {!loading && !error && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mb-3 h-10 w-10 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
              />
            </svg>
            <p className="text-sm font-medium text-slate-500">No notifications yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Activity updates will appear here.
            </p>
          </div>
        ) : null}

        {/* Notification list */}
        {!loading && !error && items.length > 0 ? (
          <div className="space-y-5">
            {groupedItems.map(({ group, items: groupItems }) => (
              <div key={group}>
                {/* Date group label */}
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {group}
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="space-y-2">
                  {groupItems.map((item) => {
                    const href = getNotificationHref(item);
                    const quickActionLabel = getQuickActionLabel(item);
                    const iconStyle = getNotificationIconStyle(item.event_type, item.is_read);

                    return (
                      <a
                        key={item.notification_id}
                        href={href}
                        onClick={(event) =>
                          void handleNotificationClick(event, item.notification_id, href)
                        }
                        className={`group flex gap-3 rounded-lg border px-3 py-3 transition-colors sm:px-4 ${
                          item.is_read
                            ? 'border-slate-200 bg-white hover:bg-slate-50'
                            : 'border-blue-100 bg-blue-50/70 hover:bg-blue-50'
                        }`}
                      >
                        {/* Event type icon */}
                        <div className="mt-0.5 shrink-0">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full ${iconStyle}`}
                          >
                            {getNotificationIcon(item.event_type, 'md')}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm leading-snug ${
                                item.is_read
                                  ? 'font-medium text-slate-800'
                                  : 'font-semibold text-slate-900'
                              }`}
                            >
                              {item.title}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                              <p className="hidden text-xs text-slate-400 sm:block">
                                {formatNotificationTimestamp(item.created_at)}
                              </p>
                              {!item.is_read ? (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                              ) : null}
                            </div>
                          </div>

                          {renderNotificationDetail(item, 'sm')}

                          {/* Footer row: timestamp (mobile) + quick action */}
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-slate-400 sm:hidden">
                              {formatNotificationTimestamp(item.created_at)}
                            </p>
                            {quickActionLabel ? (
                              <button
                                type="button"
                                onClick={(event) =>
                                  void handleQuickAction(event, item.notification_id, href)
                                }
                                className="ml-auto rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 opacity-0 transition-opacity hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 group-hover:opacity-100 focus:opacity-100"
                              >
                                {quickActionLabel} →
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => void fetchPage(Math.max(1, page - 1), pageSize)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <p className="text-sm text-slate-500">
          Page {page} of {totalPages}
        </p>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => void fetchPage(Math.min(totalPages, page + 1), pageSize)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}