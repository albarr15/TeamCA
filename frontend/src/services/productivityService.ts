import api from "./api";
import type { ProductivitySummary } from "../types/productivity";

export const productivityService = {
  getMine: async (): Promise<ProductivitySummary> => {
    const response = await api.get<ProductivitySummary>("/productivity/me");
    return response.data;
  },
};
