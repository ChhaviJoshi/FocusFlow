import { Router } from "express";
import { getNotifications } from "../controllers/notifications.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(getNotifications));

export default router;
