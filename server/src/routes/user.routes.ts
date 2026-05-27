import { Router } from "express";
import { updateProfile } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.patch("/profile", requireAuth, asyncHandler(updateProfile));

export default router;
