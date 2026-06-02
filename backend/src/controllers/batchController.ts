import type { Request, Response } from "express";
import { z } from "zod";
import {
  addBatchMembers,
  archiveBatch,
  createBatch,
  getAllAssignedUserIds,
  getBatch,
  listBatchMembers,
  listBatches,
  removeBatchMember,
  restoreBatch,
  updateBatch,
  updateBatchMember,
} from "../services/batchService.js";

const createBatchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "name must be at least 2 characters.")
    .max(120, "name must be 120 characters or fewer."),
  description: z.string().trim().max(2000).optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  supervisor_id: z.string().trim().min(1).optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  status_override: z.enum(["Active", "Completed"]).nullable().optional(),
});

const updateBatchSchema = createBatchSchema.partial().extend({
  is_archived: z.boolean().optional(),
});

const listBatchesQuerySchema = z.object({
  status: z.enum(["active", "completed", "archived", "all"]).default("all"),
});

const addMembersSchema = z.object({
  user_ids: z.array(z.string().trim().min(1)).min(1, "At least one user_id is required."),
});

const updateMemberSchema = z
  .object({
    status: z.enum(["Active", "Completed", "Withdrawn"]).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.notes !== undefined,
    { message: "At least one field must be provided." },
  );

const parseBatchId = (req: Request, res: Response): string | null => {
  const raw = req.params.batchId;
  const batchId = Array.isArray(raw) ? raw[0] : raw;
  if (!batchId) {
    res.status(400).json({ message: "batchId is required." });
    return null;
  }
  return batchId;
};

const handleServiceError = (res: Response, error: unknown) => {
  if (error instanceof Error) {
    if (error.message === "Batch not found.") {
      return res.status(404).json({ message: error.message });
    }
    if (
      error.message.includes("already exists") ||
      error.message.includes("end_date") ||
      error.message.includes("Only interns") ||
      error.message.includes("exceed batch capacity") ||
      error.message.includes("not a member") ||
      error.message.includes("not found") ||
      error.message.includes("required")
    ) {
      return res.status(400).json({ message: error.message });
    }
  }
  return res.status(500).json({ message: "Batch operation failed." });
};

export const listBatchesHandler = async (req: Request, res: Response) => {
  try {
    const query = listBatchesQuerySchema.parse(req.query);
    const batches = await listBatches(query);
    return res.json({ items: batches });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid query.", issues: error.issues });
    }
    return handleServiceError(res, error);
  }
};

export const getBatchHandler = async (req: Request, res: Response) => {
  try {
    const batchId = parseBatchId(req, res);
    if (!batchId) return;
    const batch = await getBatch(batchId);
    return res.json(batch);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

export const createBatchHandler = async (req: Request, res: Response) => {
  try {
    const payload = createBatchSchema.parse(req.body);
    const batch = await createBatch(payload);
    return res.status(201).json(batch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request body.", issues: error.issues });
    }
    return handleServiceError(res, error);
  }
};

export const updateBatchHandler = async (req: Request, res: Response) => {
  try {
    const batchId = parseBatchId(req, res);
    if (!batchId) return;
    const payload = updateBatchSchema.parse(req.body);
    const batch = await updateBatch(batchId, payload);
    return res.json(batch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request body.", issues: error.issues });
    }
    return handleServiceError(res, error);
  }
};

export const archiveBatchHandler = async (req: Request, res: Response) => {
  try {
    const batchId = parseBatchId(req, res);
    if (!batchId) return;
    const batch = await archiveBatch(batchId);
    return res.json(batch);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

export const restoreBatchHandler = async (req: Request, res: Response) => {
  try {
    const batchId = parseBatchId(req, res);
    if (!batchId) return;
    const batch = await restoreBatch(batchId);
    return res.json(batch);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

export const listBatchMembersHandler = async (req: Request, res: Response) => {
  try {
    const batchId = parseBatchId(req, res);
    if (!batchId) return;
    const members = await listBatchMembers(batchId);
    return res.json({ items: members });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

export const addBatchMembersHandler = async (req: Request, res: Response) => {
  try {
    const batchId = parseBatchId(req, res);
    if (!batchId) return;
    const payload = addMembersSchema.parse(req.body);
    const members = await addBatchMembers(batchId, payload.user_ids);
    return res.status(201).json({ items: members });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request body.", issues: error.issues });
    }
    return handleServiceError(res, error);
  }
};

export const listAssignedUserIdsHandler = async (_req: Request, res: Response) => {
  try {
    const ids = await getAllAssignedUserIds();
    return res.json({ user_ids: ids });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

export const updateBatchMemberHandler = async (req: Request, res: Response) => {
  try {
    const batchId = parseBatchId(req, res);
    if (!batchId) return;
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    const payload = updateMemberSchema.parse(req.body);
    await updateBatchMember(batchId, userId, payload);
    const members = await listBatchMembers(batchId);
    return res.json({ items: members });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request body.", issues: error.issues });
    }
    return handleServiceError(res, error);
  }
};

export const removeBatchMemberHandler = async (req: Request, res: Response) => {
  try {
    const batchId = parseBatchId(req, res);
    if (!batchId) return;
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    await removeBatchMember(batchId, userId);
    return res.status(204).send();
  } catch (error) {
    return handleServiceError(res, error);
  }
};
