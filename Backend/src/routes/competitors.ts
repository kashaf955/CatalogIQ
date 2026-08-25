import { Router } from "express";
import { z } from "zod";
import { CompetitorSite } from "../models/CompetitorSite";
import { CompetitorProduct } from "../models/CompetitorProduct";
import { ProcessingRun } from "../models/ProcessingRun";
import { asyncHandler } from "../middleware/asyncHandler";
import { runScrapeForMatches } from "../services/competitorScrapeService";
import { emitProcessingRunUpdate } from "../queue/socket";

const router = Router();

const selectorsSchema = z.object({
  searchUrlTemplate: z.string().optional(),
  resultLinkSelector: z.string().optional(),
  name: z.string().optional(),
  price: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  images: z.string().optional(),
  availability: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sites = await CompetitorSite.find().sort({ name: 1 });
    res.json(sites);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        baseUrl: z.string().url(),
        selectors: selectorsSchema.optional(),
      })
      .parse(req.body);
    const site = await CompetitorSite.create(body);
    res.status(201).json(site);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const site = await CompetitorSite.findById(req.params.id);
    if (!site) return res.status(404).json({ error: "Competitor site not found" });
    res.json(site);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).optional(),
        baseUrl: z.string().url().optional(),
        selectors: selectorsSchema.optional(),
      })
      .parse(req.body);
    const site = await CompetitorSite.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!site) return res.status(404).json({ error: "Competitor site not found" });
    res.json(site);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const site = await CompetitorSite.findByIdAndDelete(req.params.id);
    if (!site) return res.status(404).json({ error: "Competitor site not found" });
    res.status(204).send();
  })
);

router.get(
  "/:id/products",
  asyncHandler(async (req, res) => {
    const products = await CompetitorProduct.find({ competitorSite: req.params.id })
      .sort({ updatedAt: -1 })
      .limit(500);
    res.json(products);
  })
);

router.post(
  "/:id/scrape",
  asyncHandler(async (req, res) => {
    const body = z.object({ matchResultIds: z.array(z.string()).min(1) }).parse(req.body);
    const run = await ProcessingRun.create({
      type: "competitor_scrape",
      status: "queued",
      totalItems: body.matchResultIds.length,
    });
    try {
      const summary = await runScrapeForMatches(req.params.id, body.matchResultIds, run.id);
      const updated = await ProcessingRun.findById(run.id);
      emitProcessingRunUpdate(run.id, updated);
      res.json({ processingRunId: run.id, ...summary });
    } catch (err) {
      const updated = await ProcessingRun.findByIdAndUpdate(
        run.id,
        { status: "failed", errorMessages: [(err as Error).message], errorCount: 1, finishedAt: new Date() },
        { new: true }
      );
      emitProcessingRunUpdate(run.id, updated);
      res.status(400).json({ error: (err as Error).message, processingRunId: run.id });
    }
  })
);

export default router;
