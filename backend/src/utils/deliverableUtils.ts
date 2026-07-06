// file: backend/src/utils/deliverableUtils.ts
import type { DeliverablePlatform } from "../models/TaskWorkLink.js";

/**
 * Matches the host prefix of any Google Drive-family URL.
 * Covers drive.google.com, docs.google.com, sheets.google.com, slides.google.com.
 */
export const DRIVE_HOST_PATTERN =
  /^https:\/\/(drive|docs|sheets|slides)\.google\.com\//i;

/**
 * Returns true when the URL structurally matches a Google Drive / Docs /
 * Sheets / Slides link. Does NOT make a network request.
 */
export function isGoogleDriveUrl(url: string): boolean {
  return DRIVE_HOST_PATTERN.test(url);
}

/**
 * Inspects the URL and returns the most likely platform label.
 * This runs on the backend so the client-side detection result is
 * always confirmed server-side before being persisted.
 */
export function detectPlatform(url: string): DeliverablePlatform {
  const normalized = url.toLowerCase();

  if (normalized.includes("github.com")) return "github";
  if (normalized.includes("figma.com")) return "figma";
  if (
    normalized.includes("drive.google.com") ||
    normalized.includes("docs.google.com") ||
    normalized.includes("sheets.google.com") ||
    normalized.includes("slides.google.com")
  ) {
    return "drive";
  }
  if (
    normalized.includes("vercel.app") ||
    normalized.includes("vercel.com")
  ) {
    return "vercel";
  }
  if (normalized.includes("notion.so") || normalized.includes("notion.site")) {
    return "notion";
  }

  return "other";
}
