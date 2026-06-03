import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import type { TaskWorkLink } from '../../../types/task';
import { detectPlatform, isValidDeliverableUrl, PLATFORM_LABELS } from '../../../utils/deliverableUtils';
import DeliverableCard from './DeliverableCard';

type TaskLinksProps = {
  currentUserId: string;
  links: TaskWorkLink[];
  linkDraft: { url: string; label: string };
  submitting: boolean;
  deletingId: string | null;
  copiedId: string | null;
  reviewingId: string | null;
  canAdd: boolean;
  canDeleteAny: boolean;
  canDeleteOwn: boolean;
  canReview: boolean;
  onDraftChange: (draft: { url: string; label: string }) => void;
  onAdd: () => void;
  onDelete: (workLinkId: string) => void;
  onCopy: (workLinkId: string, url: string) => void;
  onReview: (workLinkId: string, status: 'approved' | 'rejected', notes?: string) => void;
};

export default function TaskLinks({
  currentUserId,
  links,
  linkDraft,
  submitting,
  deletingId,
  copiedId,
  reviewingId,
  canAdd,
  canDeleteAny,
  canDeleteOwn,
  canReview,
  onDraftChange,
  onAdd,
  onDelete,
  onCopy,
  onReview,
}: TaskLinksProps) {
  const [urlError, setUrlError] = useState('');

  const detectedPlatform =
    linkDraft.url.trim().length > 0 ? detectPlatform(linkDraft.url) : null;

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onDraftChange({ ...linkDraft, url: value });
    if (urlError && value.trim()) setUrlError('');
  };

  const handleAdd = () => {
    if (!linkDraft.url.trim()) {
      setUrlError('URL is required.');
      return;
    }
    if (!isValidDeliverableUrl(linkDraft.url.trim())) {
      setUrlError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setUrlError('');
    onAdd();
  };

  // How many links are pending supervisor action
  const pendingCount = links.filter((l) => l.status === 'pending_review').length;

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4 shrink-0 text-slate-500"
        >
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
        <h4 className="text-sm font-semibold text-slate-900">Deliverable Links</h4>
        {links.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
            {links.length}
          </span>
        )}
      </div>

      {/* Supervisor pending-review notice — mirrors the feedback section notice pattern */}
      {canReview && pendingCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="mt-0.5 text-sm" aria-hidden="true">🔍</span>
          <span>
            <strong>{pendingCount}</strong>{' '}
            {pendingCount === 1 ? 'deliverable is' : 'deliverables are'} awaiting your review.
          </span>
        </div>
      )}

      {/* Add form — intern only */}
      {canAdd && (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Input
                label="Deliverable URL"
                value={linkDraft.url}
                onChange={handleUrlChange}
                placeholder="https://github.com/…"
              />
              {/* Platform auto-detect hint / validation error */}
              {urlError ? (
                <p className="mt-1 text-xs text-red-600">{urlError}</p>
              ) : detectedPlatform ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                  Detected: <strong>{PLATFORM_LABELS[detectedPlatform]}</strong>
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Paste a link to detect the platform</p>
              )}
            </div>
            <Input
              label="Label (optional)"
              value={linkDraft.label}
              onChange={(event) => onDraftChange({ ...linkDraft, label: event.target.value })}
              placeholder="e.g. Final prototype"
            />
          </div>
          <div className="mt-3">
            <Button type="button" size="sm" loading={submitting} onClick={handleAdd}>
              Submit Deliverable
            </Button>
          </div>
        </div>
      )}

      {/* Card list */}
      <div className="space-y-2">
        {links.length === 0 ? (
          <p className="text-sm text-slate-500">No deliverables submitted yet.</p>
        ) : (
          links.map((link) => (
            <DeliverableCard
              key={link.work_link_id}
              link={link}
              currentUserId={currentUserId}
              canDeleteAny={canDeleteAny}
              canDeleteOwn={canDeleteOwn}
              canReview={canReview}
              deletingId={deletingId}
              copiedId={copiedId}
              reviewingId={reviewingId}
              onDelete={onDelete}
              onCopy={onCopy}
              onReview={onReview}
            />
          ))
        )}
      </div>
    </section>
  );
}
