import type { Request, Response } from "express";
import { z } from "zod";
import {
  createEvaluation,
  getAlumniProfile,
  getArchiveCandidate,
  listArchiveCandidates,
  listAlumni,
} from "../services/alumniService.js";
import { approveOffboarding } from "../services/offboardingApprovalService.js";

const evaluationSchema = z.object({
  summary: z.string().trim().min(3).max(4000),
  strengths: z.string().trim().min(3).max(4000),
  improvement_areas: z.string().trim().min(3).max(4000),
  recommendation: z.string().trim().min(3).max(2000),
});

const archiveSchema = z.object({
  override: z.boolean().optional(),
  override_reason: z.string().trim().max(2000).optional(),
});

const getUserId = (req: Request) => {
  const value = req.params.userId;
  return Array.isArray(value) ? value[0] : value;
};

export const listAlumniHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const query = typeof req.query.search === "string" ? req.query.search : "";
    return res.json(await listAlumni(query));
  } catch {
    return res.status(500).json({ message: "Failed to load alumni directory." });
  }
};

export const getAlumniProfileHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    return res.json(await getAlumniProfile(getUserId(req)));
  } catch (error) {
    if (error instanceof Error && error.message === "Alumni profile not found.") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to load alumni profile." });
  }
};

export const listArchiveCandidatesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const search = typeof req.query.search === "string" ? req.query.search : "";
    return res.json(await listArchiveCandidates(req.user, search));
  } catch (error) {
    if (error instanceof Error && error.message.includes("permissions")) return res.status(403).json({ message: error.message });
    return res.status(500).json({ message: "Failed to load archive candidates." });
  }
};

export const getArchiveCandidateHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    return res.json(await getArchiveCandidate(req.user, getUserId(req)));
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) return res.status(404).json({ message: error.message });
    if (error instanceof Error && error.message.includes("permissions")) return res.status(403).json({ message: error.message });
    return res.status(500).json({ message: "Failed to load archive candidate." });
  }
};

export const createEvaluationHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const input = evaluationSchema.parse(req.body);
    return res.status(201).json(await createEvaluation(req.user, getUserId(req), input));
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid evaluation.", issues: error.issues });
    if (error instanceof Error && (error.message.includes("permission") || error.message.includes("read-only") || error.message.includes("not found"))) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to create evaluation." });
  }
};

export const archiveInternHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    archiveSchema.parse(req.body ?? {});
    return res.json(await approveOffboarding(req.user, getUserId(req)));
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid archive request.", issues: error.issues });
    if (error instanceof Error && (error.message.includes("permission") || error.message.includes("required") || error.message.includes("completed") || error.message.includes("already") || error.message.includes("not found"))) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to archive intern." });
  }
};
