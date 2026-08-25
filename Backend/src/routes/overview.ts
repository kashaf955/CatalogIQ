import { Router } from "express";
import { OurProduct } from "../models/OurProduct";
import { ManufacturerProduct } from "../models/ManufacturerProduct";
import { MatchResult } from "../models/MatchResult";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

/** Summary cards for the Overview dashboard (spec section 20). */
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [
      totalProducts,
      totalManufacturerProducts,
      matched,
      needsReview,
      discontinued,
      replacementAvailable,
      noMatch,
      pendingReview,
    ] = await Promise.all([
      OurProduct.countDocuments(),
      ManufacturerProduct.countDocuments(),
      MatchResult.countDocuments({ matchStatus: "matched" }),
      MatchResult.countDocuments({ matchStatus: "needs_review" }),
      MatchResult.countDocuments({ matchStatus: "discontinued" }),
      MatchResult.countDocuments({ matchStatus: "replacement_available" }),
      MatchResult.countDocuments({ matchStatus: "no_match" }),
      MatchResult.countDocuments({ reviewStatus: "pending" }),
    ]);

    const productsProcessed = await MatchResult.countDocuments();

    res.json({
      totalProducts,
      totalManufacturerProducts,
      productsProcessed,
      matched,
      needsReview,
      discontinued,
      replacementAvailable,
      noMatch,
      pendingReview,
    });
  })
);

export default router;
