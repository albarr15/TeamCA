import { Router } from "express";
import authenticateJWT from "../middlewares/auth.js";
import {
  archiveInternHandler,
  createEvaluationHandler,
  getAlumniProfileHandler,
  getArchiveCandidateHandler,
  listArchiveCandidatesHandler,
  listAlumniHandler,
} from "../controllers/alumniController.js";

const router = Router();
router.use(authenticateJWT);
router.get("/", listAlumniHandler);
router.get("/candidates", listArchiveCandidatesHandler);
router.get("/review/:userId", getArchiveCandidateHandler);
router.get("/:userId", getAlumniProfileHandler);
router.post("/:userId/evaluations", createEvaluationHandler);
router.post("/:userId/archive", archiveInternHandler);

export default router;
