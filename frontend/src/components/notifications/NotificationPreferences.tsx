import { useEffect, useRef, useState } from 'react';
import { notificationService } from '../../services/notificationService';
import type {
  NotificationPreferences,
  NotificationPreferenceGroup,
} from '../../types/notification';
import { NOTIFICATION_PREFERENCE_GROUPS } from '../../types/notification';
import Card from '../ui/Card';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');

  // Debounce timer ref — we save automatically 600 ms after the last toggle
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track pending updates that haven't been sent yet
  const pendingRef = useRef<Partial<NotificationPreferences>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    notificationService
      .getPreferences()
      .then((data) => {
        if (!cancelled) {
          setPrefs(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load notification preferences.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Flush pending changes to the API
  const flush = async (pending: Partial<NotificationPreferences>) => {
    if (Object.keys(pending).length === 0) return;
    setSaveStatus('saving');
    try {
      const updated = await notificationService.updatePreferences(pending);
      setPrefs(updated);
      setSaveStatus('saved');
      pendingRef.current = {};
      // Reset "Saved" badge after 2 s
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch {
      setSaveStatus('error');
      setError('Failed to save preferences. Please try again.');
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!prefs) return;

    const next = !prefs[key];

    // Optimistic UI update
    setPrefs((prev: NotificationPreferences | null) => (prev ? { ...prev, [key]: next } : prev));
    setSaveStatus('idle');
    setError('');

    // Accumulate pending changes
    pendingRef.current = { ...pendingRef.current, [key]: next };

    // Debounce: reset timer on every toggle
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flush({ ...pendingRef.current });
    }, 600);
  };

  // Flush on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (Object.keys(pendingRef.current).length > 0) {
        void notificationService.updatePreferences(pendingRef.current);
      }
    };
  }, []);

  const handleToggleAll = (enable: boolean) => {
    if (!prefs) return;
    const keys = Object.keys(prefs) as (keyof NotificationPreferences)[];
    const allUpdates = Object.fromEntries(keys.map((k) => [k, enable])) as Partial<NotificationPreferences>;

    setPrefs((prev: NotificationPreferences | null) => (prev ? { ...prev, ...allUpdates } : prev));
    setSaveStatus('idle');
    setError('');

    pendingRef.current = { ...pendingRef.current, ...allUpdates };

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flush({ ...pendingRef.current });
    }, 600);
  };

  if (loading) {
    return (
      <Card
        title="Notification Preferences"
        subtitle="Choose which in-app notifications you receive."
        className="border-slate-200 shadow-sm shadow-slate-200/60"
      >
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </Card>
    );
  }

  if (!prefs) {
    return (
      <Card
        title="Notification Preferences"
        subtitle="Choose which in-app notifications you receive."
        className="border-slate-200 shadow-sm shadow-slate-200/60"
      >
        <p className="text-sm text-red-600">{error || 'Could not load preferences.'}</p>
      </Card>
    );
  }

  const allEnabled = Object.values(prefs).every(Boolean);
  const allDisabled = Object.values(prefs).every((v) => !v);

  return (
    <Card
      title="Notification Preferences"
      subtitle="Choose which in-app notifications you receive."
      className="border-slate-200 shadow-sm shadow-slate-200/60"
    >
      {/* Header row with bulk actions and save status */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={allEnabled}
            onClick={() => handleToggleAll(true)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enable all
          </button>
          <button
            type="button"
            disabled={allDisabled}
            onClick={() => handleToggleAll(false)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Disable all
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-slate-500">
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-green-600">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-600">{error}</span>
          )}
        </div>
      </div>

      {/* Preference groups */}
      <div className="space-y-5">
        {NOTIFICATION_PREFERENCE_GROUPS.map((group: NotificationPreferenceGroup) => (
          <div key={group.label}>
            <div className="mb-2 border-b border-slate-100 pb-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {group.label}
              </p>
            </div>
            <div className="space-y-1">
              {group.events.map(({ key, label, description }: NotificationPreferenceGroup['events'][number]) => {
                const enabled = prefs[key] !== false;
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500">{description}</p>
                    </div>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => handleToggle(key)}
                      className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                        enabled ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                      <span className="sr-only">{enabled ? 'Disable' : 'Enable'} {label}</span>
                    </button>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}