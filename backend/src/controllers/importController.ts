import type { Request, Response } from "express";
import { importUsersFromCsv as importUsersFromCsvService } from "../services/importService.js";
import {
  compactActivityChanges,
  logActivityForRequest,
  optionalActivityText,
} from "../utils/activityLogPayload.js";

export const importUsersFromCsv = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const result = await importUsersFromCsvService(req.file.buffer, {
      actorGlobalRole: req.user?.global_role,
    });

    await logActivityForRequest(req, {
      action_type: "create",
      resource_type: "user",
      description: `Bulk user import completed: ${result.successful_inserts} of ${result.total_processed} users created.`,
      changes: compactActivityChanges({
        total_processed: result.total_processed,
        successful_inserts: result.successful_inserts,
        failed_count: result.failed_rows.length,
        failed_rows: result.failed_rows,
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
      }),
    });

    return res.status(200).json(result);
  } catch (err) {
    await logActivityForRequest(req, {
      action_type: "create",
      resource_type: "user",
      description: "Bulk user import failed.",
      changes: compactActivityChanges({
        error: err instanceof Error ? err.message : "Unknown import failure.",
        performed_by_user_id: optionalActivityText(req.user?.user_id),
        performed_by_email: optionalActivityText(req.user?.email),
      }),
      status: "failed",
    });

    return res.status(500).json({ message: "Failed to import users." });
  }
};
