// file: backend/src/utils/deliverableUtils.ts
import type { DeliverablePlatform } from "../models/TaskWorkLink.js";

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
