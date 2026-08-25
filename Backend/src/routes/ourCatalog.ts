import { Router } from "express";
import { z } from "zod";
import { OurProduct } from "../models/OurProduct";
import { catalogFileUpload } from "../middleware/upload";
import { asyncHandler } from "../middleware/asyncHandler";
import { parseUploadedFile } from "../services/fileParsingService";
import { suggestFieldMap } from "../services/columnMappingService";
import { importOurCatalogRows } from "../services/ourCatalogImportService";
import { standardProductSchema } from "../types/standardProduct";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { brand, category, search } = req.query as Record<string, string | undefined>;
    const query: Record<string, unknown> = {};
    if (brand) query.brand = brand;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { sku: new RegExp(escapeRegex(search), "i") },
        { mpn: new RegExp(escapeRegex(search), "i") },
        { name: new RegExp(escapeRegex(search), "i") },
      ];
    }
    const products = await OurProduct.find(query).sort({ updatedAt: -1 }).limit(500);
    res.json(products);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = standardProductSchema.extend({ sku: z.string().min(1) }).parse(req.body);
    const product = await OurProduct.create({ ...body, sourceType: "api" });
    res.status(201).json(product);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await OurProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = standardProductSchema.partial().parse(req.body);
    const product = await OurProduct.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await OurProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.status(204).send();
  })
);

router.post(
  "/upload/preview",
  catalogFileUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const parsed = await parseUploadedFile(req.file.buffer, req.file.originalname);
    res.json({
      headers: parsed.headers,
      suggestedMapping: suggestFieldMap(parsed.headers),
      sampleRows: parsed.rows.slice(0, 10),
      totalRows: parsed.rows.length,
    });
  })
);

router.post(
  "/upload/import",
  catalogFileUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fieldMap = z.record(z.string(), z.string()).parse(JSON.parse(req.body.fieldMap ?? "{}"));

    const parsed = await parseUploadedFile(req.file.buffer, req.file.originalname);
    const sourceType = req.file.originalname.toLowerCase().endsWith(".csv") ? "csv" : "excel";
    const summary = await importOurCatalogRows(parsed.rows, fieldMap, sourceType);
    res.json(summary);
  })
);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;
