// frontend/src/services/readinessService.ts
// API client for the Internship Completion Readiness Score.

import api from './api';
import type { ReadinessBreakdown } from '../types/readiness';

export const readinessService = {
  /**
   * GET /offboarding/readiness-score/me
   * The authenticated intern's own readiness score.
   */
  getMine: async (): Promise<ReadinessBreakdown> => {
    const response = await api.get<ReadinessBreakdown>(
      '/offboarding/readiness-score/me',
    );
    return response.data;
  },

  /**
   * GET /offboarding/readiness-score/:userId
   * A reviewer's view of a specific intern's readiness score.
   */
  getForUser: async (userId: string): Promise<ReadinessBreakdown> => {
    const response = await api.get<ReadinessBreakdown>(
      `/offboarding/readiness-score/${userId}`,
    );
    return response.data;
  },
};