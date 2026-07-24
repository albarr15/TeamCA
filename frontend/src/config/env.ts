const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

// In Docker the frontend proxies /api and /socket.io to the backend. Using the
// page origin prevents separate direct connections to localhost:3000.
const defaultBackendUrl =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

export const config = {
  backendUrl: trimTrailingSlashes(
    import.meta.env.PUBLIC_BACKEND_URL || defaultBackendUrl,
  ),
};
