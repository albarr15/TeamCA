// frontend/src/services/api.ts
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { config } from "@/config/env";

const api = axios.create({
  baseURL: config.backendUrl + "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((req) => {
  let token = useAuthStore.getState().token;

  if (!token) {
    const stored = localStorage.getItem("auth-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed?.state?.token;
    }
  }

  if (token) {
    req.headers["Authorization"] = `Bearer ${token}`;
  }

  return req;
});

// Handle 401 responses (expired or invalid token)
// Handle responses and unwrap standardized data automatically
api.interceptors.response.use(
  (response: any) => {
    // If the backend sends our new { success: true, data: ... } format, unwrap it!
    if (response.data && response.data.success === true && response.data.data !== undefined) {
      const unwrapped = response.data.data;

      // Advanced Polyfill: Create an invisible safety net for legacy frontend files
      // This allows components to use BOTH res.data AND res.data.data safely
      if (typeof unwrapped === "object" && unwrapped !== null) {
        if (!("data" in unwrapped)) {
          Object.defineProperty(unwrapped, "data", { get: () => unwrapped, enumerable: false });
        }
        if (!("success" in unwrapped)) {
          Object.defineProperty(unwrapped, "success", { value: true, enumerable: false });
        }
        // Safety net for DTR's "count" property
        if (Array.isArray(unwrapped) && !("count" in unwrapped)) {
          Object.defineProperty(unwrapped, "count", { get: () => unwrapped.length, enumerable: false });
        }
      }

      response.data = unwrapped;
    }
    return response;
  },
  (error: any) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore.getState();
      authStore.logout();

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    
    if (error.response?.data?.message) {
        error.message = error.response.data.message;
    }
    
    return Promise.reject(error);
  }
);

export default api;
