import { Router } from "express";
import authenticateJWT from "../middlewares/auth.js";
import { getMyProductivityHandler } from "../controllers/productivityController.js";

const router = Router();

router.get("/me", authenticateJWT, getMyProductivityHandler);

export default router;
