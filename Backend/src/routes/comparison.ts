import { Router } from "express";
import { MatchResult } from "../models/MatchResult";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

/**
 * The manufacturer side-by-side comparison workspace (spec section 8):
 * filter by manufacturer + brand(s) + status + category + match/discontinued
 * state, then return the joined our/manufacturer/competitor rows.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { manufacturer, brand, matchStatus, reviewStatus, category, search } =
      req.query as Record<string, string | undefined>;

    const query: Record<string, unknown> = {};
    if (manufacturer) query.manufacturer = manufacturer;
    if (brand) query.brand = { $in: brand.split(",") };
    if (matchStatus) query.matchStatus = { $in: matchStatus.split(",") };
    if (reviewStatus) query.reviewStatus = { $in: reviewStatus.split(",") };

    let rows = await MatchResult.find(query)
      .populate("ourProduct")
      .populate("manufacturerProduct")
      .populate("competitorProduct")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    if (category) {
      rows = rows.filter((r) => {
        const our = r.ourProduct as unknown as { category?: string } | undefined;
        const mfg = r.manufacturerProduct as unknown as { category?: string } | undefined;
        return our?.category === category || mfg?.category === category;
      });
    }

    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter((r) => {
        const our = r.ourProduct as unknown as { sku?: string; mpn?: string; name?: string } | undefined;
        const mfg = r.manufacturerProduct as unknown as { mpn?: string; name?: string } | undefined;
        return [our?.sku, our?.mpn, our?.name, mfg?.mpn, mfg?.name]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle));
      });
    }

    res.json(rows);
  })
);

export default router;
