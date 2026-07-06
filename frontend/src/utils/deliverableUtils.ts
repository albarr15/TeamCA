// frontend/src/utils/deliverableUtils.ts
// Client-side mirror of backend/src/utils/deliverableUtils.ts
// Shared by DeliverableCard, TaskLinks, and anywhere that needs platform detection.

export type DeliverablePlatform =
  | 'github'
  | 'figma'
  | 'drive'
  | 'vercel'
  | 'notion'
  | 'other';

export const PLATFORM_LABELS: Record<DeliverablePlatform, string> = {
  github: 'GitHub',
  figma: 'Figma',
  drive: 'Google Drive',
  vercel: 'Vercel',
  notion: 'Notion',
  other: 'Link',
};

/** Auto-detects the platform from a URL string. Mirrors the backend helper. */
export function detectPlatform(url: string): DeliverablePlatform {
  const n = url.toLowerCase();
  if (n.includes('github.com')) return 'github';
  if (n.includes('figma.com')) return 'figma';
  if (
    n.includes('drive.google.com') ||
    n.includes('docs.google.com') ||
    n.includes('sheets.google.com') ||
    n.includes('slides.google.com')
  )
    return 'drive';
  if (n.includes('vercel.app') || n.includes('vercel.com')) return 'vercel';
  if (n.includes('notion.so') || n.includes('notion.site')) return 'notion';
  return 'other';
}

/** Returns true when a URL is http/https and structurally valid. */
export function isValidDeliverableUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Matches the host prefix of any Google Drive-family URL.
 * Covers drive.google.com, docs.google.com, sheets.google.com, slides.google.com.
 */
export const DRIVE_HOST_PATTERN =
  /^https:\/\/(drive|docs|sheets|slides)\.google\.com\//i;

/**
 * Returns true when the URL structurally matches a Google Drive / Docs /
 * Sheets / Slides link. Mirrors backend/src/utils/deliverableUtils.ts.
 * Does NOT make a network request.
 */
export function isGoogleDriveUrl(url: string): boolean {
  return DRIVE_HOST_PATTERN.test(url);
}
