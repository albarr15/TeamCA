import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { checkEmail, login, completeSetup, logout } from "./authService.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import InternProfile from "../models/InternProfile.js";

describe("authService", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "super-secret-test-key";
  });

  describe("checkEmail", () => {
    it("should return exists: false if the user is not in the database", async () => {
      const result = await checkEmail("unknown@example.com");
      expect(result).toEqual({ exists: false, needsSetup: false });
    });

    it("should return exists: true and needsSetup: true if user is inactive", async () => {
      await User.create({ email: "newuser@example.com", is_active: false });
      
      const result = await checkEmail("NEWUSER@example.com"); // Testing normalization
      expect(result).toEqual({ exists: true, needsSetup: true });
    });

    it("should return exists: true and needsSetup: false if user is active", async () => {
      await User.create({ email: "active@example.com", is_active: true });
      
      const result = await checkEmail("active@example.com");
      expect(result).toEqual({ exists: true, needsSetup: false });
    });
  });

  describe("login", () => {
    it("should throw an error if the user does not exist", async () => {
      await expect(login({ email: "missing@example.com", password: "password123" }))
        .rejects.toThrow("Invalid credentials.");
    });

    it("should throw an error if the password does not match", async () => {
      const password_hash = await bcrypt.hash("correct-password", 10);
      await User.create({ 
        email: "user@example.com", 
        password_hash, 
        is_active: true 
      });

      await expect(login({ email: "user@example.com", password: "wrong-password" }))
        .rejects.toThrow("Invalid credentials.");
    });

    it("should throw an error if the account setup is incomplete (is_active: false)", async () => {
      const password_hash = await bcrypt.hash("password123", 10);
      await User.create({ 
        email: "inactive@example.com", 
        password_hash, 
        is_active: false 
      });

      await expect(login({ email: "inactive@example.com", password: "password123" }))
        .rejects.toThrow("Account setup is incomplete.");
    });

    it("should return a token and safe user object on successful login", async () => {
      const password_hash = await bcrypt.hash("password123", 10);
      const user = await User.create({ 
        email: "success@example.com", 
        password_hash, 
        is_active: true,
        first_name: "John",
        last_name: "Doe"
      });

      const result = await login({ email: "success@example.com", password: "password123" });
      
      expect(result.token).toBeDefined();
      expect(result.user._id).toEqual(user._id);
      expect(result.user).not.toHaveProperty("password_hash"); // Ensuring SAFE_USER_SELECT worked
    });
  });

    describe("completeSetup", () => {
        let mockDeptId: string;

        beforeEach(async () => {
        const department = await Department.create({ department_name: "Engineering" });
        mockDeptId = department._id.toString();
        });

    it("should throw an error if missing required fields (School/University)", async () => {
      await expect(completeSetup({
        email: "test@example.com",
        first_name: "Jane",
        last_name: "Doe",
        password: "password123",
        department_id: mockDeptId,
        school_university: "   ", // Blank spaces
        required_hours: 400
      })).rejects.toThrow("School/University is required.");
    });

    it("should throw an error if required hours is invalid", async () => {
      await expect(completeSetup({
        email: "test@example.com",
        first_name: "Jane",
        last_name: "Doe",
        password: "password123",
        department_id: mockDeptId,
        school_university: "University of Tech",
        required_hours: 0 // Invalid hours
      })).rejects.toThrow("Required hours must be at least 1.");
    });

    it("should throw an error if email is not whitelisted (user not found)", async () => {
      await expect(completeSetup({
        email: "notwhitelisted@example.com",
        first_name: "Jane",
        last_name: "Doe",
        password: "password123",
        department_id: mockDeptId,
        school_university: "University of Tech",
        required_hours: 400
      })).rejects.toThrow("Email is not whitelisted.");
    });

    it("should throw an error if the account is already active", async () => {
      await User.create({ email: "active@example.com", is_active: true });

      await expect(completeSetup({
        email: "active@example.com",
        first_name: "Jane",
        last_name: "Doe",
        password: "password123",
        department_id: mockDeptId,
        school_university: "University of Tech",
        required_hours: 400
      })).rejects.toThrow("Account is already active.");
    });

    it("should complete setup successfully, hash password, and initialize InternProfile", async () => {
      const uninitializedUser = await User.create({ 
        email: "newintern@example.com", 
        is_active: false 
      });

      const payload = {
        email: "newintern@example.com",
        first_name: "Mark",
        last_name: "Zuckerberg",
        password: "securepassword",
        department_id: mockDeptId,
        school_university: "Harvard",
        required_hours: 500
      };

      const result = await completeSetup(payload);

      // 1. Verify token & return object
      expect(result.token).toBeDefined();
      expect(result.user.first_name).toBe("Mark");
      expect(result.user).not.toHaveProperty("password_hash");

      // 2. Verify User document updates
      const updatedUser = await User.findById(uninitializedUser._id).lean();
      expect(updatedUser?.is_active).toBe(true);
      expect(updatedUser?.global_role).toBe("Standard_User");
      expect(updatedUser?.departments?.[0].department_id.toString()).toBe(mockDeptId);
      
      // Verify password was hashed
      const isPasswordHashedCorrectly = await bcrypt.compare("securepassword", updatedUser?.password_hash || "");
      expect(isPasswordHashedCorrectly).toBe(true);

      // 3. Verify InternProfile creation
      const profile = await InternProfile.findOne({ user_id: uninitializedUser._id }).lean();
      expect(profile).toBeDefined();
      expect(profile?.school_university).toBe("Harvard");
      expect(profile?.required_hours).toBe(500);
      expect(profile?.rendered_hours_total).toBe(0); // Check default values
    });
  });

  describe("logout", () => {
    it("should return a successful logout message", async () => {
      const result = await logout();
      expect(result).toEqual({ message: "Logged out successfully." });
    });
  });
});