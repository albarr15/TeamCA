import React, { useState, useEffect, useCallback } from 'react';
import type { DeliverableStatus, OffboardingDriveLink } from '../../../types/task';
import type { User, Department } from '../../../types/user';
import { taskService } from '../../../services/taskService';
import { userService } from '../../../services/userService';
import { departmentService } from '../../../services/departmentService';
import DriveLinkStatusBadge from './DriveLinkStatusBadge';

// ── Icons ──────────────────────────────────────────────────────────────────
const IconSpinner = () => (
  <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="10" strokeWidth="3" className="opacity-25" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const DriveIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-600">
    <path d="M4.433 22.396l2.083-3.607H21.9l-2.083 3.607H4.433zm5.55-6.26L6.9 22.396H2.1L8.767 10.73l3.083 5.407h-1.867zm3.883-6.697L8.767 19.107 5.683 13.7 10.983 4.49l3.083 5.407-1.2 2.06zM21.9 22.396h-4.8L10.434 10.73 13.517 5.32 21.9 22.396z" />
  </svg>
);

// ── Card Styles ────────────────────────────────────────────────────────────
const CARD_STATUS_CLS: Record<DeliverableStatus, string> = {
  pending_review: 'border-slate-200 bg-white',
  approved: 'border-green-200 bg-green-50/40',
  rejected: 'border-red-200 bg-red-50/40',
  revision_requested: 'border-indigo-200 bg-indigo-50/40',
};

export default function ReviewPanel() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<DeliverableStatus | ''>('');

  const [links, setLinks] = useState<OffboardingDriveLink[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'revision_requested' | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string>('');

  // ── Data Fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function fetchMetadata() {
      try {
        const [usersData, deptsData] = await Promise.all([
          userService.getAllUsers(),
          departmentService.getAllDepartments()
        ]);
        if (!mounted) return;
        
        const uMap: Record<string, User> = {};
        usersData.forEach(u => uMap[u._id || u.user_id || ''] = u);
        setUsersMap(uMap);
        setDepartments(deptsData);
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      }
    }
    void fetchMetadata();
    return () => { mounted = false; };
  }, []);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await taskService.getOffboardingDriveLinks({
        departmentId: departmentFilter || undefined,
        status: (statusFilter as DeliverableStatus) || undefined,
      });
      setLinks(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load deliverables.');
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, statusFilter]);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleOpenReviewModal = (linkId: string, action: 'approved' | 'rejected' | 'revision_requested') => {
    setSelectedLinkId(linkId);
    setReviewAction(action);
    setReviewNotes('');
    setReviewError('');
    setReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setReviewModalOpen(false);
    setTimeout(() => {
      setSelectedLinkId(null);
      setReviewAction(null);
      setReviewNotes('');
      setReviewError('');
    }, 300);
  };

  const handleSubmitReview = async () => {
    if (!selectedLinkId || !reviewAction) return;
    if ((reviewAction === 'rejected' || reviewAction === 'revision_requested') && !reviewNotes.trim()) {
      setReviewError('Review notes are required for rejections or revisions.');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    try {
      await taskService.reviewOffboardingDriveLink(selectedLinkId, {
        status: reviewAction,
        review_notes: reviewNotes.trim() || undefined,
      });
      handleCloseReviewModal();
      await fetchLinks();
    } catch (err: any) {
      setReviewError(err?.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── View Helpers ───────────────────────────────────────────────────────────
  const getSubmitterName = (userId: string) => {
    const u = usersMap[userId];
    return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unknown User';
  };

  const getSubmitterDepartment = (userId: string) => {
    const u = usersMap[userId];
    const deptId = u?.departments?.[0]?.department_id;
    if (!deptId) return 'No Department';
    const dept = departments.find(d => String(d._id) === String(deptId) || String(d.department_id) === String(deptId));
    return dept?.department_name || 'Unknown Department';
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Filter Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Deliverable Reviews</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Review and manage offboarding submissions from interns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d._id || d.department_id} value={d._id || d.department_id}>
                {d.department_name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as DeliverableStatus | '')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="revision_requested">Revision Requested</option>
            <option value="rejected">Rejected</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* ── Submissions Grid ──────────────────────────────────────────────── */}
      <div className="min-h-[300px]">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <IconSpinner />
            <span className="ml-2 text-sm font-medium">Loading submissions...</span>
          </div>
        ) : links.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto mb-3 h-10 w-10 text-slate-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="text-sm font-medium text-slate-500">No deliverables found.</p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your department or status filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {links.map(link => {
              const statusCls = CARD_STATUS_CLS[link.status ?? 'pending_review'];
              return (
                <div 
                  key={link.work_link_id} 
                  className={`flex flex-col rounded-xl border p-4 shadow-sm transition-all duration-200 ${statusCls}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 line-clamp-1" title={getSubmitterName(link.submitted_by)}>
                        {getSubmitterName(link.submitted_by)}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500">
                        {getSubmitterDepartment(link.submitted_by)}
                      </p>
                    </div>
                    <DriveLinkStatusBadge status={link.status} />
                  </div>
                  
                  <div className="mb-4 flex-1">
                    <p className="text-xs font-medium text-slate-700 line-clamp-2 mb-2">
                      {link.task_title}
                    </p>
                    
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600"
                    >
                      <DriveIcon />
                      <span className="truncate max-w-[150px]">{link.label || 'Google Drive Link'}</span>
                    </a>
                  </div>
                  
                  {/* Actions */}
                  {link.status === 'pending_review' ? (
                    <div className="grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 mt-auto">
                      <button
                        onClick={() => handleOpenReviewModal(link.work_link_id, 'approved')}
                        className="rounded-lg bg-green-50 px-2 py-1.5 text-[11px] font-semibold text-green-700 transition-colors hover:bg-green-100"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleOpenReviewModal(link.work_link_id, 'revision_requested')}
                        className="rounded-lg bg-indigo-50 px-2 py-1.5 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                      >
                        Revise
                      </button>
                      <button
                        onClick={() => handleOpenReviewModal(link.work_link_id, 'rejected')}
                        className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto border-t border-slate-200/60 pt-3">
                      <p className="text-center text-[11px] font-medium text-slate-500">
                        Reviewed on {link.reviewed_at ? new Date(link.reviewed_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Review Modal ──────────────────────────────────────────────────── */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={!submittingReview ? handleCloseReviewModal : undefined}
          />
          
          <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-800">
                {reviewAction === 'approved' ? 'Approve Deliverable' : 
                 reviewAction === 'revision_requested' ? 'Request Revision' : 'Reject Deliverable'}
              </h3>
              <button 
                onClick={handleCloseReviewModal}
                disabled={submittingReview}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-5">
              {(reviewAction === 'rejected' || reviewAction === 'revision_requested') ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="review-notes" className="text-sm font-medium text-slate-700">
                    Review Notes <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-1">
                    {reviewAction === 'revision_requested' 
                      ? 'Provide instructions on what needs to be changed.'
                      : 'Provide feedback on why this was rejected.'}
                  </p>
                  <textarea
                    id="review-notes"
                    rows={4}
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    disabled={submittingReview}
                    placeholder="Type your notes here..."
                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:opacity-70"
                  />
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  <p>You are about to approve this deliverable. The intern will be notified.</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <label htmlFor="review-notes-opt" className="text-sm font-medium text-slate-700">
                      Optional Notes
                    </label>
                    <textarea
                      id="review-notes-opt"
                      rows={2}
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      disabled={submittingReview}
                      placeholder="e.g. Great job on this!"
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:opacity-70"
                    />
                  </div>
                </div>
              )}
              
              {reviewError && (
                <p className="mt-3 text-sm font-medium text-red-600">{reviewError}</p>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
              <button
                onClick={handleCloseReviewModal}
                disabled={submittingReview}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className={`flex min-w-[90px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-70 ${
                  reviewAction === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                  reviewAction === 'revision_requested' ? 'bg-indigo-600 hover:bg-indigo-700' :
                  'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submittingReview ? <IconSpinner /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
