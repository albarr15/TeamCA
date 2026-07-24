// frontend/src/types/extension.ts
// Types for the Internship Extension Request workflow
// (POST/GET/PATCH /offboarding/extension-requests...).

export type ExtensionRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ExtensionHistoryAction =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface ExtensionHistoryEntry {
  action: ExtensionHistoryAction;
  actor_id: string;
  actor_name: string;
  remarks: string | null;
  timestamp: string | Date;
}

export interface ExtensionRequest {
  extension_request_id: string;
  intern_id: string;
  requested_by: string;
  department_id: string | null;
  additional_hours: number;
  previous_required_hours: number;
  new_required_hours: number;
  reason: string;
  status: ExtensionRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
  rejection_reason: string | null;
  history: ExtensionHistoryEntry[];
  created_at: string | Date;
  updated_at: string | Date;
}

// ---------------------------------------------------------------------------
// Create Extension Request  (POST /offboarding/extension-requests)
// ---------------------------------------------------------------------------

export interface CreateExtensionRequestPayload {
  /** Omit to file for yourself; provide to file on behalf of an intern in your scope. */
  intern_id?: string;
  additional_hours: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Review Extension Request  (PATCH /offboarding/extension-requests/:id/review)
// ---------------------------------------------------------------------------

export interface ReviewExtensionRequestPayload {
  status: 'approved' | 'rejected';
  /** Required when status is "rejected". */
  remarks?: string;
}

// ---------------------------------------------------------------------------
// List Extension Requests Query  (GET /offboarding/extension-requests/pending)
// ---------------------------------------------------------------------------

export interface ListExtensionRequestsQuery {
  departmentId?: string;
  status?: ExtensionRequestStatus;
}