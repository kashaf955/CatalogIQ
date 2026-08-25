import { Router } from "express";
import { ProcessingRun } from "../models/ProcessingRun";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const runs = await ProcessingRun.find().sort({ createdAt: -1 }).limit(100);
    res.json(runs);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const run = await ProcessingRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: "Processing run not found" });
    res.json(run);
  })
);

export default router;
