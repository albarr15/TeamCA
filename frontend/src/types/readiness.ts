// frontend/src/types/readiness.ts
// Types for the Internship Completion Readiness Score.
// Mirrors the shape returned by GET /offboarding/readiness-score/me
// and GET /offboarding/readiness-score/:userId.

export type ReadinessState = 'Not Ready' | 'Almost Ready' | 'Eligible';

export interface ReadinessDetails {
  renderedHours: number;
  requiredHours: number;
  tasksCompleted: number;
  tasksTotal: number;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  deliverablesApproved: number;
  deliverablesTotal: number;
}

export interface ReadinessBreakdown {
  hoursScore: number;
  taskScore: number;
  attendanceScore: number;
  deliverablesScore: number;
  overallScore: number;
  state: ReadinessState;
  details: ReadinessDetails;
}