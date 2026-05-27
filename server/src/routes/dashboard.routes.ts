import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get("/summary", requireAuth, asyncHandler(getDashboardSummary));

export default router;
