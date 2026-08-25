import { Router } from "express";
import { ManufacturerProduct } from "../models/ManufacturerProduct";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { manufacturer, brand, status, category, search } = req.query as Record<
      string,
      string | undefined
    >;
    const query: Record<string, unknown> = {};
    if (manufacturer) query.manufacturer = manufacturer;
    if (brand) query.brand = { $in: brand.split(",") };
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ mpn: re }, { sku: re }, { name: re }];
    }
    const products = await ManufacturerProduct.find(query).sort({ updatedAt: -1 }).limit(500);
    res.json(products);
  })
);

export default router;
