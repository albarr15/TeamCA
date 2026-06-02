import api from "./api";
import type {
  Batch,
  BatchMember,
  BatchMemberStatus,
  BatchStatusFilter,
  CreateBatchPayload,
  UpdateBatchPayload,
} from "../types/batch";

type ItemList<T> = { items: T[] };

export const batchService = {
  list: async (status: BatchStatusFilter = "all"): Promise<Batch[]> => {
    const response = await api.get<ItemList<Batch>>("/batches", {
      params: { status },
      headers: {},
    });
    return response.data.items;
  },

  get: async (batchId: string): Promise<Batch> => {
    const response = await api.get<Batch>(`/batches/${batchId}`);
    return response.data;
  },

  create: async (payload: CreateBatchPayload): Promise<Batch> => {
    const response = await api.post<Batch>("/batches", payload);
    return response.data;
  },

  update: async (batchId: string, payload: UpdateBatchPayload): Promise<Batch> => {
    const response = await api.patch<Batch>(`/batches/${batchId}`, payload);
    return response.data;
  },

  archive: async (batchId: string): Promise<Batch> => {
    const response = await api.post<Batch>(`/batches/${batchId}/archive`);
    return response.data;
  },

  restore: async (batchId: string): Promise<Batch> => {
    const response = await api.post<Batch>(`/batches/${batchId}/restore`);
    return response.data;
  },

  listMembers: async (batchId: string): Promise<BatchMember[]> => {
    const response = await api.get<ItemList<BatchMember>>(
      `/batches/${batchId}/members`,
    );
    return response.data.items;
  },

  addMembers: async (
    batchId: string,
    userIds: string[],
  ): Promise<BatchMember[]> => {
    const response = await api.post<ItemList<BatchMember>>(
      `/batches/${batchId}/members`,
      { user_ids: userIds },
    );
    return response.data.items;
  },

  removeMember: async (batchId: string, userId: string): Promise<void> => {
    await api.delete(`/batches/${batchId}/members/${userId}`);
  },

  listAssignedUserIds: async (): Promise<string[]> => {
    const response = await api.get<{ user_ids: string[] }>(
      "/batches/assigned-user-ids",
    );
    return response.data.user_ids;
  },

  updateMember: async (
    batchId: string,
    userId: string,
    payload: { status?: BatchMemberStatus; notes?: string },
  ): Promise<BatchMember[]> => {
    const response = await api.patch<ItemList<BatchMember>>(
      `/batches/${batchId}/members/${userId}`,
      payload,
    );
    return response.data.items;
  },
};
