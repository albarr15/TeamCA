import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../../store/authStore";
import {
  canAccessRoute,
  getDashboardRouteForUser,
  getRouteAccessDescription,
} from "../../lib/roleRoutes";

// 1. Polyfill localStorage for the Node environment so Zustand's persist middleware doesn't crash
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// 2. Define Mock Users for our different testing scenarios
const mockIntern = {
  _id: "intern_1",
  user_id: "intern_1",
  email: "intern@test.com",
  first_name: "Tired",
  last_name: "Intern",
  global_role: "Standard_User",
  is_active: true,
  departments: [{ department_id: "dept_1", department_role: "Intern" }],
} as any;

const mockHead = {
  _id: "head_1",
  user_id: "head_1",
  email: "head@test.com",
  first_name: "Department",
  last_name: "Head",
  global_role: "Standard_User", // Standard global role, but elevated department role
  is_active: true,
  departments: [{ department_id: "dept_1", department_role: "Head" }],
} as any;

const mockSuperadmin = {
  _id: "admin_1",
  user_id: "admin_1",
  email: "admin@test.com",
  first_name: "Super",
  last_name: "Admin",
  global_role: "Superadmin",
  is_active: true,
  departments: [],
} as any;

describe("Dashboard & Role Routing Integration Flow", () => {
  beforeEach(() => {
    // Clear the store and local storage before every test
    globalThis.localStorage.clear();
    useAuthStore.getState().logout();
  });

  describe("Store Role Helpers (Zustand)", () => {
    it("should correctly identify an Intern's permissions", () => {
      useAuthStore.getState().login("fake-token", mockIntern);
      const store = useAuthStore.getState();

      expect(store.isIntern()).toBe(true);
      expect(store.canManageUsers()).toBe(false);
      expect(store.isSuperadmin()).toBe(false);
      expect(store.getUserFullName()).toBe("Tired Intern");
    });

    it("should correctly identify a Superadmin's permissions", () => {
      useAuthStore.getState().login("fake-token", mockSuperadmin);
      const store = useAuthStore.getState();

      expect(store.isSuperadmin()).toBe(true);
      expect(store.canWhitelistEmails()).toBe(true);
      expect(store.canManageUsers()).toBe(true);
      expect(store.isIntern()).toBe(false);
    });
  });

  describe("Dashboard Routing Logic", () => {
    it("should route unauthenticated users to /login", () => {
      expect(getDashboardRouteForUser(null)).toBe("/login");
    });

    it("should route authenticated users to /dashboard", () => {
      expect(getDashboardRouteForUser(mockIntern)).toBe("/dashboard");
      expect(getDashboardRouteForUser(mockSuperadmin)).toBe("/dashboard");
    });
  });

  describe("Route Access Control (RBAC)", () => {
    it("should allow any authenticated user to access public routes", () => {
      expect(canAccessRoute(mockIntern, "/dashboard")).toBe(true);
      expect(canAccessRoute(mockIntern, "/profile")).toBe(true);
      // Unknown routes default to true for authenticated users
      expect(canAccessRoute(mockIntern, "/some-random-page")).toBe(true);
    });

    it("should block unauthenticated users from everything", () => {
      expect(canAccessRoute(null, "/dashboard")).toBe(false);
      expect(canAccessRoute(null, "/users")).toBe(false);
    });

    it("should restrict /users to Admins and Department Heads", () => {
      // Interns cannot access
      expect(canAccessRoute(mockIntern, "/users")).toBe(false);
      
      // Heads CAN access (via department role)
      expect(canAccessRoute(mockHead, "/users")).toBe(true);
      
      // Superadmins CAN access (via global role)
      expect(canAccessRoute(mockSuperadmin, "/users")).toBe(true);
    });

    it("should restrict prefix routes like /reports strictly to Superadmins", () => {
      // Because /reports is prefix: true, /reports/dtr should also be blocked
      expect(canAccessRoute(mockIntern, "/reports")).toBe(false);
      expect(canAccessRoute(mockHead, "/reports/dtr")).toBe(false);
      
      // Only Superadmin is allowed
      expect(canAccessRoute(mockSuperadmin, "/reports/dtr")).toBe(true);
    });
  });

  describe("Human-readable Access Descriptions", () => {
    it("should generate readable permission strings for unauthorized screens", () => {
      expect(getRouteAccessDescription("/reports")).toBe("Super Admins");
      expect(getRouteAccessDescription("/users")).toBe("Super Admins, Admins and Department Heads, Supervisors");
      expect(getRouteAccessDescription("/dashboard")).toBe("all authenticated users");
    });
  });
});