import { Router } from "express";
import { z } from "zod";
import { MatchResult } from "../models/MatchResult";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { manufacturer, brand } = req.query as Record<string, string | undefined>;
    const query: Record<string, unknown> = { reviewStatus: "pending", matchStatus: "needs_review" };
    if (manufacturer) query.manufacturer = manufacturer;
    if (brand) query.brand = { $in: brand.split(",") };

    const items = await MatchResult.find(query)
      .populate("ourProduct")
      .populate("manufacturerProduct")
      .populate("competitorProduct")
      .sort({ updatedAt: -1 })
      .limit(200);
    res.json(items);
  })
);

const decisionSchema = z.object({ notes: z.string().optional() });

router.patch(
  "/:id/approve",
  asyncHandler(async (req, res) => updateReview(req, res, "approved"))
);
router.patch(
  "/:id/reject",
  asyncHandler(async (req, res) => updateReview(req, res, "rejected"))
);
router.patch(
  "/:id/variant",
  asyncHandler(async (req, res) => updateReview(req, res, "variant"))
);
router.patch(
  "/:id/needs-info",
  asyncHandler(async (req, res) => updateReview(req, res, "needs_info"))
);

async function updateReview(
  req: import("express").Request,
  res: import("express").Response,
  reviewStatus: "approved" | "rejected" | "variant" | "needs_info"
) {
  const body = decisionSchema.parse(req.body ?? {});
  const update: Record<string, unknown> = { reviewStatus, decisionSource: "human" };
  if (body.notes) update.notes = body.notes;

  const item = await MatchResult.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!item) return res.status(404).json({ error: "Match result not found" });
  res.json(item);
}

export default router;
