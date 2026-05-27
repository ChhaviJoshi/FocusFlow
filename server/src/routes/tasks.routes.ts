import { Router } from "express";
import {
  patchTask,
  patchTaskByOriginalItemId,
  getTasks,
} from "../controllers/tasks.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// List tasks (optionally filtered by ?status=pending|completed|dismissed)
router.get("/", requireAuth, asyncHandler(getTasks));

// Update task status
router.patch("/:id", requireAuth, asyncHandler(patchTask));

// Update task status by original inbox item id
router.patch(
  "/by-item/:originalItemId",
  requireAuth,
  asyncHandler(patchTaskByOriginalItemId),
);

export default router;
