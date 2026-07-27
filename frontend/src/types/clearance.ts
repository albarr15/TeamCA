// frontend/src/types/clearance.ts
// Types for the Clearance Approval Timeline
// (GET /offboarding/clearance-timeline/me, GET /offboarding/clearance-timeline/:userId).

export type ClearanceTimelineCategory = 'deliverable' | 'extension' | 'clearance';

export type ClearanceTimelineAction =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'cancelled';

export interface ClearanceTimelineEntry {
  id: string;
  category: ClearanceTimelineCategory;
  action: ClearanceTimelineAction | string;
  actor_id: string;
  actor_name: string;
  notes: string | null;
  context: string | null;
  timestamp: string | Date;
}

// ---------------------------------------------------------------------------
// List Clearance Timeline Query
// ---------------------------------------------------------------------------

export interface ClearanceTimelineQuery {
  /** Filter down to only rejected or revision-requested actions. */
  status?: 'rejected' | 'revision_requested';
}