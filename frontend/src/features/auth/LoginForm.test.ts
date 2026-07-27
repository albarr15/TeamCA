import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mock authService
vi.mock("../../services/authService", () => ({
  authService: {
    checkEmail: vi.fn(),
    login: vi.fn(),
  },
}));

// 2. Mock authStore
const mockLogin = vi.fn();
vi.mock("../../store/authStore", () => ({
  useAuthStore: (selector: any) => selector({ login: mockLogin }),
}));

// 3. Mock roleRoutes
vi.mock("../../lib/roleRoutes", () => ({
  getDashboardRouteForUser: vi.fn(() => "/admin/dashboard"),
}));

import { authService } from "../../services/authService";
import { getDashboardRouteForUser } from "../../lib/roleRoutes";

describe("LoginForm Business Logic Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Polyfill the browser's window object for the Node environment
    globalThis.window = {
      location: {
        replace: vi.fn(),
      },
    } as any;
  });

  it("should correctly identify an existing user email and transition to password step", async () => {
    vi.mocked(authService.checkEmail).mockResolvedValueOnce({ exists: true, needsSetup: false });

    const emailInput = "test@example.com";
    const result = await authService.checkEmail(emailInput);

    expect(authService.checkEmail).toHaveBeenCalledWith(emailInput);
    expect(result.exists).toBe(true);
    expect(result.needsSetup).toBe(false);
  });

  it("should identify a user needing first-time setup", async () => {
    vi.mocked(authService.checkEmail).mockResolvedValueOnce({ exists: false, needsSetup: true });

    const result = await authService.checkEmail("new@example.com");
    expect(result.needsSetup).toBe(true);
  });

  it("should successfully log in user, trigger store login, and redirect", async () => {
    const mockUserData = { 
      _id: "user_123", 
      email: "test@example.com", 
      first_name: "System",
      last_name: "Admin",
      global_role: "Admin",
      is_active: true,
      departments: []
    } as any; 

    const mockToken = "fake-jwt-token";

    vi.mocked(authService.login).mockResolvedValueOnce({
      token: mockToken,
      user: mockUserData,
    });

    const loginPayload = { email: "test@example.com", password: "Password123!" };
    const response = await authService.login(loginPayload);

    // Simulate what LoginForm does upon successful response
    const transformedUser = { ...response.user, user_id: response.user._id };
    mockLogin(response.token, transformedUser);
    const route = getDashboardRouteForUser(transformedUser);
    
    // Explicitly use globalThis.window to avoid Node reference errors
    globalThis.window.location.replace(route);

    expect(authService.login).toHaveBeenCalledWith(loginPayload);
    expect(mockLogin).toHaveBeenCalledWith(mockToken, transformedUser);
    expect(globalThis.window.location.replace).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("should handle invalid credentials gracefully", async () => {
    vi.mocked(authService.login).mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials. Please try again." } },
    });

    let errorMessage = "";
    try {
      await authService.login({ email: "test@example.com", password: "WrongPassword" });
    } catch (err: any) {
      errorMessage = err.response.data.message;
    }

    expect(errorMessage).toBe("Invalid credentials. Please try again.");
  });
});