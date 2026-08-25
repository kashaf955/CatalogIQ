import { Router } from "express";
import { z } from "zod";
import { ProcessingRun } from "../models/ProcessingRun";
import { asyncHandler } from "../middleware/asyncHandler";
import { runManufacturerComparison } from "../services/matchingEngine";
import { emitProcessingRunUpdate } from "../queue/socket";

const router = Router();

router.post(
  "/run",
  asyncHandler(async (req, res) => {
    const body = z
      .object({ manufacturerId: z.string().min(1), brands: z.array(z.string()).min(1) })
      .parse(req.body);

    const run = await ProcessingRun.create({
      type: "matching",
      status: "running",
      manufacturer: body.manufacturerId,
      startedAt: new Date(),
    });

    try {
      const result = await runManufacturerComparison(body.manufacturerId, body.brands);
      const updated = await ProcessingRun.findByIdAndUpdate(
        run.id,
        {
          status: "completed",
          totalItems: result.manufacturerProductsProcessed,
          processedItems: result.matchResultsWritten,
          finishedAt: new Date(),
        },
        { new: true }
      );
      emitProcessingRunUpdate(run.id, updated);
      res.json({ processingRunId: run.id, ...result });
    } catch (err) {
      const updated = await ProcessingRun.findByIdAndUpdate(
        run.id,
        {
          status: "failed",
          errorMessages: [(err as Error).message],
          errorCount: 1,
          finishedAt: new Date(),
        },
        { new: true }
      );
      emitProcessingRunUpdate(run.id, updated);
      res.status(400).json({ error: (err as Error).message, processingRunId: run.id });
    }
  })
);

export default router;
