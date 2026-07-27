// frontend/src/services/clearanceService.ts
// API client for the Clearance Approval Timeline.

import api from './api';
import type {
  ClearanceTimelineEntry,
  ClearanceTimelineQuery,
} from '../types/clearance';

export const clearanceService = {
  /**
   * GET /offboarding/clearance-timeline/me
   * The authenticated intern's own clearance approval timeline.
   */
  getMyClearanceTimeline: async (
    query?: ClearanceTimelineQuery,
  ): Promise<ClearanceTimelineEntry[]> => {
    const response = await api.get<ClearanceTimelineEntry[]>(
      '/offboarding/clearance-timeline/me',
      { headers: {}, params: { status: query?.status } },
    );
    return response.data;
  },

  /**
   * GET /offboarding/clearance-timeline/:userId
   * A reviewer's view of a specific intern's clearance approval timeline.
   */
  getClearanceTimeline: async (
    userId: string,
    query?: ClearanceTimelineQuery,
  ): Promise<ClearanceTimelineEntry[]> => {
    const response = await api.get<ClearanceTimelineEntry[]>(
      `/offboarding/clearance-timeline/${userId}`,
      { headers: {}, params: { status: query?.status } },
    );
    return response.data;
  },
};