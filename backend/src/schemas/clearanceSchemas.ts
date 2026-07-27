// backend/src/schemas/clearanceSchemas.ts

import { z } from "zod";

// ---------------------------------------------------------------------------
// Clearance Approval Timeline Query
// (GET /offboarding/clearance-timeline/me, GET /offboarding/clearance-timeline/:userId)
// ---------------------------------------------------------------------------

export const clearanceTimelineQuerySchema = z.object({
  /** Filter the timeline down to only rejected or revision-requested actions. */
  status: z.enum(["rejected", "revision_requested"]).optional(),
});

export type ClearanceTimelineQuery = z.infer<typeof clearanceTimelineQuerySchema>;