import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Manufacturer } from "../models/Manufacturer";
import { ManufacturerProduct } from "../models/ManufacturerProduct";
import { ImportMapping } from "../models/ImportMapping";
import { ProcessingRun } from "../models/ProcessingRun";
import { catalogFileUpload } from "../middleware/upload";
import { asyncHandler } from "../middleware/asyncHandler";
import { parseUploadedFile } from "../services/fileParsingService";
import { suggestFieldMap } from "../services/columnMappingService";
import { importManufacturerRows } from "../services/manufacturerImportService";
import { emitProcessingRunUpdate } from "../queue/socket";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const manufacturers = await Manufacturer.find().sort({ name: 1 });
    res.json(manufacturers);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = z.object({ name: z.string().min(1) }).parse(req.body);
    const manufacturer = await Manufacturer.create(body);
    res.status(201).json(manufacturer);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const manufacturer = await Manufacturer.findById(req.params.id);
    if (!manufacturer) return res.status(404).json({ error: "Manufacturer not found" });
    res.json(manufacturer);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const manufacturer = await Manufacturer.findByIdAndDelete(req.params.id);
    if (!manufacturer) return res.status(404).json({ error: "Manufacturer not found" });
    res.status(204).send();
  })
);

router.get(
  "/:id/brands",
  asyncHandler(async (req, res) => {
    const counts = await ManufacturerProduct.aggregate([
      { $match: { manufacturer: new Types.ObjectId(req.params.id) } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(counts.map((c) => ({ brand: c._id, count: c.count })));
  })
);

router.get(
  "/:id/mapping",
  asyncHandler(async (req, res) => {
    const mapping = await ImportMapping.findOne({
      manufacturer: req.params.id,
      sourceType: "manufacturer",
    }).sort({ updatedAt: -1 });
    res.json(mapping ?? null);
  })
);

router.post(
  "/:id/mapping",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        fieldMap: z.record(z.string(), z.string()),
        brandColumn: z.string().optional(),
      })
      .parse(req.body);
    const mapping = await ImportMapping.findOneAndUpdate(
      { manufacturer: req.params.id, sourceType: "manufacturer" },
      { ...body, manufacturer: req.params.id, sourceType: "manufacturer" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(mapping);
  })
);

router.post(
  "/:id/upload/preview",
  catalogFileUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const manufacturer = await Manufacturer.findById(req.params.id);
    if (!manufacturer) return res.status(404).json({ error: "Manufacturer not found" });

    const parsed = await parseUploadedFile(req.file.buffer, req.file.originalname);
    const savedMapping = await ImportMapping.findOne({
      manufacturer: req.params.id,
      sourceType: "manufacturer",
    }).sort({ updatedAt: -1 });

    res.json({
      headers: parsed.headers,
      suggestedMapping: savedMapping
        ? Object.fromEntries(savedMapping.fieldMap)
        : suggestFieldMap(parsed.headers),
      suggestedBrandColumn: savedMapping?.brandColumn,
      sampleRows: parsed.rows.slice(0, 10),
      totalRows: parsed.rows.length,
    });
  })
);

router.post(
  "/:id/upload/import",
  catalogFileUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const manufacturer = await Manufacturer.findById(req.params.id);
    if (!manufacturer) return res.status(404).json({ error: "Manufacturer not found" });

    const fieldMap = z.record(z.string(), z.string()).parse(JSON.parse(req.body.fieldMap ?? "{}"));
    const brandColumn = typeof req.body.brandColumn === "string" ? req.body.brandColumn : undefined;

    const parsed = await parseUploadedFile(req.file.buffer, req.file.originalname);
    const run = await ProcessingRun.create({
      type: "manufacturer_import",
      status: "queued",
      manufacturer: req.params.id,
      totalItems: parsed.rows.length,
    });

    const summary = await importManufacturerRows(
      req.params.id,
      parsed.rows,
      fieldMap,
      brandColumn,
      run.id
    );
    const updated = await ProcessingRun.findById(run.id);
    emitProcessingRunUpdate(run.id, updated);
    res.json({ processingRunId: run.id, ...summary });
  })
);

export default router;
