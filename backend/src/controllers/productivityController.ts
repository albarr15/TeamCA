import type { Request, Response } from "express";
import { getProductivitySummary } from "../services/productivityService.js";

export const getMyProductivityHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user?.user_id) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const summary = await getProductivitySummary(String(req.user.user_id));
    return res.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found.") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to load productivity summary." });
  }
};
