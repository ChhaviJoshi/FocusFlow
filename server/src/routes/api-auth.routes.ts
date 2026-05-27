import { Router } from "express";
import {
  registerLocalUser,
  loginLocalUser,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.post("/register", asyncHandler(registerLocalUser));
router.post("/login", asyncHandler(loginLocalUser));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/reset-password", asyncHandler(resetPassword));

export default router;
