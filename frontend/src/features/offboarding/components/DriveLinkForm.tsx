// frontend/src/features/offboarding/components/DriveLinkForm.tsx
// Form for submitting a new Google Drive deliverable link.
// Provides real-time Drive URL validation and platform auto-detection feedback.

import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { isGoogleDriveUrl, isValidDeliverableUrl } from '../../../utils/deliverableUtils';
import type { Task } from '../../../types/task';

type DriveLinkFormProps = {
  /** Tasks the intern can submit deliverables for (Under Review or Completed). */
  eligibleTasks: Pick<Task, 'task_id' | 'title'>[];
  submitting: boolean;
  onSubmit: (taskId: string, url: string, label?: string) => void;
};

export default function DriveLinkForm({
  eligibleTasks,
  submitting,
  onSubmit,
}: DriveLinkFormProps) {
  const [taskId, setTaskId] = useState('');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [urlError, setUrlError] = useState('');
  const [taskError, setTaskError] = useState('');

  const isDriveUrl = url.trim().length > 0 && isGoogleDriveUrl(url.trim());
  const isHttpsUrl = url.trim().length > 0 && isValidDeliverableUrl(url.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!taskId) {
      setTaskError('Please select a task.');
      valid = false;
    } else {
      setTaskError('');
    }

    if (!url.trim()) {
      setUrlError('Google Drive URL is required.');
      valid = false;
    } else if (!isHttpsUrl) {
      setUrlError('Please enter a valid URL starting with https://');
      valid = false;
    } else if (!isDriveUrl) {
      setUrlError(
        'Must be a Google Drive, Docs, Sheets, or Slides link ' +
          '(drive.google.com, docs.google.com, sheets.google.com, or slides.google.com).',
      );
      valid = false;
    } else {
      setUrlError('');
    }

    if (!valid) return;

    onSubmit(taskId, url.trim(), label.trim() || undefined);
    // Reset after successful submit (parent clears submitting on completion)
    setTaskId('');
    setUrl('');
    setLabel('');
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (urlError && e.target.value.trim()) setUrlError('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-4"
      noValidate
    >
      <div className="flex items-center gap-2">
        {/* Google Drive colour icon */}
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-600">
          <path d="M4.433 22.396l2.083-3.607H21.9l-2.083 3.607H4.433zm5.55-6.26L6.9 22.396H2.1L8.767 10.73l3.083 5.407h-1.867zm3.883-6.697L8.767 19.107 5.683 13.7 10.983 4.49l3.083 5.407-1.2 2.06zM21.9 22.396h-4.8L10.434 10.73 13.517 5.32 21.9 22.396z" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-800">Submit a Google Drive deliverable</h3>
      </div>

      {/* Task selector */}
      <div className="flex flex-col gap-1">
        <label htmlFor="drive-link-task" className="text-sm font-medium text-slate-700">
          Task <span className="text-red-500">*</span>
        </label>
        {eligibleTasks.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 italic">
            No tasks in "Under Review" or "Completed" status yet.
          </p>
        ) : (
          <select
            id="drive-link-task"
            value={taskId}
            onChange={(e) => {
              setTaskId(e.target.value);
              if (taskError) setTaskError('');
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${taskError ? 'border-red-400' : 'border-slate-300'}`}
          >
            <option value="">Select a task…</option>
            {eligibleTasks.map((t) => (
              <option key={String(t.task_id)} value={String(t.task_id)}>
                {t.title}
              </option>
            ))}
          </select>
        )}
        {taskError && <p className="text-xs text-red-600">{taskError}</p>}
      </div>

      {/* URL input */}
      <div>
        <Input
          id="drive-link-url"
          label="Google Drive URL *"
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://drive.google.com/…"
          error={urlError}
        />
        {/* Platform detection hint */}
        {!urlError && url.trim().length > 0 && (
          isDriveUrl ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Detected: <strong>Google Drive</strong>
            </p>
          ) : isHttpsUrl ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              Not a Google Drive link – only Drive, Docs, Sheets, or Slides URLs are accepted here.
            </p>
          ) : null
        )}
      </div>

      {/* Label (optional) */}
      <Input
        id="drive-link-label"
        label="Label (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Final project report"
      />

      <div>
        <Button
          type="submit"
          size="sm"
          loading={submitting}
          disabled={eligibleTasks.length === 0}
        >
          Submit deliverable
        </Button>
      </div>
    </form>
  );
}
