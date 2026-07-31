// backend/src/schemas/certificateSchemas.ts
//
// ASSUMPTION: written against zod, matching the convention already used in
// exitFeedbackSchemas.ts / taskSchemas.ts.

import { z } from "zod";

export const issueCertificateSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
});

export const revokeCertificateSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});