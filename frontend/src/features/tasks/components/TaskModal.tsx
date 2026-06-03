import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import type { TaskComment, TaskDetail, TaskFeedback, TaskStatus, TaskWorkLink } from '../../../types/task';
import TaskActions from './TaskActions';
import TaskComments from './TaskComments';
import TaskDetails from './TaskDetails';
import TaskFeedbacks from './TaskFeedbacks';
import TaskLinks from './TaskLinks';
import TaskTimeline from './TaskTimeline';
import { WidgetSkeleton } from '../../../components/ui/Skeleton';

type TaskModalProps = {
  open: boolean;
  task: TaskDetail | null;
  isLoading: boolean;
  statusUpdating: boolean;
  commentsSubmitting: boolean;
  feedbackSubmitting: boolean;
  linksSubmitting: boolean;
  linkDeletingId: string | null;
  copiedLinkId: string | null;
  linkReviewingId: string | null;
  commentDraft: string;
  feedbackDraft: string;
  linkDraft: { url: string; label: string };
  onClose: () => void;
  onCommentDraftChange: (value: string) => void;
  onFeedbackDraftChange: (value: string) => void;
  onLinkDraftChange: (draft: { url: string; label: string }) => void;
  onUpdateStatus: (nextStatus: TaskStatus) => void;
  onAddComment: () => void;
  onAddFeedback: () => void;
  onAddLink: () => void;
  onDeleteLink: (workLinkId: string) => void;
  onCopyLink: (workLinkId: string, url: string) => void;
  onReviewLink: (workLinkId: string, status: 'approved' | 'rejected', notes?: string) => void;
  comments: TaskComment[];
  feedbackItems: TaskFeedback[];
  links: TaskWorkLink[];
  currentUserId: string;
  canSubmitFeedback: boolean;
  canAddLinks: boolean;
  canDeleteAnyLink: boolean;
  canDeleteOwnLink: boolean;
  canReviewLinks: boolean;
  canEditTaskDetails: boolean;
  onEditTaskDetails: () => void;
};

export default function TaskModal({
  open,
  task,
  isLoading,
  statusUpdating,
  commentsSubmitting,
  feedbackSubmitting,
  linksSubmitting,
  linkDeletingId,
  copiedLinkId,
  linkReviewingId,
  commentDraft,
  feedbackDraft,
  linkDraft,
  onClose,
  onCommentDraftChange,
  onFeedbackDraftChange,
  onLinkDraftChange,
  onUpdateStatus,
  onAddComment,
  onAddFeedback,
  onAddLink,
  onDeleteLink,
  onCopyLink,
  onReviewLink,
  comments,
  feedbackItems,
  links,
  currentUserId,
  canSubmitFeedback,
  canAddLinks,
  canDeleteAnyLink,
  canDeleteOwnLink,
  canReviewLinks,
  canEditTaskDetails,
  onEditTaskDetails,
}: TaskModalProps) {
  const [displayTask, setDisplayTask] = useState<TaskDetail | null>(task);

  useEffect(() => {
    if (task) {
      setDisplayTask(task);
    }
  }, [task]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={displayTask?.title}
      className="max-w-5xl"
      headerAction={canEditTaskDetails ? (
        <Button type="button" variant="outline" size="sm" onClick={onEditTaskDetails}>
          Edit details
        </Button>
      ) : undefined}
    >
      {isLoading ? (
        <div className="space-y-4">
          <WidgetSkeleton lines={4} />
          <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <WidgetSkeleton lines={4} />
            <WidgetSkeleton lines={4} />
          </div>
        </div>
      ) : !displayTask ? null : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4">
            <TaskDetails task={displayTask} />
            <TaskActions task={displayTask} statusUpdating={statusUpdating} onUpdateStatus={onUpdateStatus} />
            <TaskLinks
              currentUserId={currentUserId}
              links={links}
              linkDraft={linkDraft}
              submitting={linksSubmitting}
              deletingId={linkDeletingId}
              copiedId={copiedLinkId}
              reviewingId={linkReviewingId}
              canAdd={canAddLinks}
              canDeleteAny={canDeleteAnyLink}
              canDeleteOwn={canDeleteOwnLink}
              canReview={canReviewLinks}
              onDraftChange={onLinkDraftChange}
              onAdd={onAddLink}
              onDelete={onDeleteLink}
              onCopy={onCopyLink}
              onReview={onReviewLink}
            />
            <TaskFeedbacks
              feedbackItems={feedbackItems}
              draft={feedbackDraft}
              submitting={feedbackSubmitting}
              canSubmit={canSubmitFeedback}
              onDraftChange={onFeedbackDraftChange}
              onSubmit={onAddFeedback}
            />
          </div>
          <div className="space-y-4">
            <TaskTimeline history={displayTask.history} />
            <TaskComments
              comments={comments}
              draft={commentDraft}
              submitting={commentsSubmitting}
              onDraftChange={onCommentDraftChange}
              onSubmit={onAddComment}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
