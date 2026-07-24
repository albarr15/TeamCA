import api from "./api";
import type { AlumniEvaluation, AlumniListItem, AlumniProfile, ArchiveCandidate } from "../types/alumni";

export type EvaluationPayload = {
  summary: string;
  strengths: string;
  improvement_areas: string;
  recommendation: string;
};

export const alumniService = {
  list: async (search = ""): Promise<AlumniListItem[]> => {
    const response = await api.get<AlumniListItem[]>("/alumni", {
      params: search.trim() ? { search: search.trim() } : undefined,
      headers: {},
    });
    return response.data;
  },

  get: async (userId: string): Promise<AlumniProfile> => {
    const response = await api.get<AlumniProfile>(`/alumni/${userId}`);
    return response.data;
  },

  listCandidates: async (search = ""): Promise<ArchiveCandidate[]> => {
    const response = await api.get<ArchiveCandidate[]>("/alumni/candidates", {
      params: search.trim() ? { search: search.trim() } : undefined,
      headers: {},
    });
    return response.data;
  },

  getCandidate: async (userId: string): Promise<AlumniProfile> => {
    const response = await api.get<AlumniProfile>(`/alumni/review/${userId}`);
    return response.data;
  },

  addEvaluation: async (userId: string, payload: EvaluationPayload): Promise<AlumniEvaluation> => {
    const response = await api.post<AlumniEvaluation>(`/alumni/${userId}/evaluations`, payload);
    return response.data;
  },

  archive: async (userId: string, payload: { override?: boolean; override_reason?: string } = {}): Promise<AlumniProfile> => {
    const response = await api.post<AlumniProfile>(`/alumni/${userId}/archive`, payload);
    return response.data;
  },
};
