// frontend/src/services/extensionService.ts
// API client for the Internship Extension Request workflow.

import api from './api';
import type {
  CreateExtensionRequestPayload,
  ExtensionRequest,
  ListExtensionRequestsQuery,
  ReviewExtensionRequestPayload,
} from '../types/extension';

export const extensionService = {
  /**
   * POST /offboarding/extension-requests
   * File a new extension request — for yourself, or (if you're a Head/
   * Supervisor/Admin/Superadmin) on behalf of an intern in your scope.
   */
  submitExtensionRequest: async (
    payload: CreateExtensionRequestPayload,
  ): Promise<ExtensionRequest> => {
    const response = await api.post<ExtensionRequest>(
      '/offboarding/extension-requests',
      payload,
    );
    return response.data;
  },

  /**
   * GET /offboarding/extension-requests/me
   * Get the authenticated intern's own extension request history.
   */
  getMyExtensionRequests: async (): Promise<ExtensionRequest[]> => {
    const response = await api.get<ExtensionRequest[]>(
      '/offboarding/extension-requests/me',
    );
    return response.data;
  },

  /**
   * GET /offboarding/extension-requests/pending
   * Get the reviewer's pending queue (Admins/Superadmins: all; Heads/
   * Supervisors: department-scoped).
   */
  getPendingExtensionRequests: async (
    query?: ListExtensionRequestsQuery,
  ): Promise<ExtensionRequest[]> => {
    const response = await api.get<ExtensionRequest[]>(
      '/offboarding/extension-requests/pending',
      {
        headers: {},
        params: {
          departmentId: query?.departmentId,
          status: query?.status,
        },
      },
    );
    return response.data;
  },

  /**
   * PATCH /offboarding/extension-requests/:requestId/review
   * Approve or reject a pending extension request.
   */
  reviewExtensionRequest: async (
    requestId: string,
    payload: ReviewExtensionRequestPayload,
  ): Promise<ExtensionRequest> => {
    const response = await api.patch<ExtensionRequest>(
      `/offboarding/extension-requests/${requestId}/review`,
      payload,
    );
    return response.data;
  },

  /**
   * PATCH /offboarding/extension-requests/:requestId/cancel
   * Cancel your own pending extension request.
   */
  cancelExtensionRequest: async (requestId: string): Promise<ExtensionRequest> => {
    const response = await api.patch<ExtensionRequest>(
      `/offboarding/extension-requests/${requestId}/cancel`,
      {},
    );
    return response.data;
  },
};