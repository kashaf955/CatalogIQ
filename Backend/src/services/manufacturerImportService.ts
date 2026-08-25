import { Manufacturer } from "../models/Manufacturer";
import { ManufacturerProduct, ManufacturerStatus } from "../models/ManufacturerProduct";
import { ProcessingRun } from "../models/ProcessingRun";
import { FieldMap, mapRowsToStandardProducts } from "./columnMappingService";

export interface ManufacturerImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
  brandsSeen: string[];
}

const STATUS_ALIASES: Record<string, ManufacturerStatus> = {
  active: "active",
  discontinued: "discontinued",
  disc: "discontinued",
  replacement: "replacement",
  replaced: "replacement",
  "out of stock": "out_of_stock",
  outofstock: "out_of_stock",
  backorder: "out_of_stock",
};

function normalizeStatus(raw?: string): ManufacturerStatus {
  if (!raw) return "unknown";
  const key = raw.trim().toLowerCase();
  return STATUS_ALIASES[key] ?? "unknown";
}

/**
 * Imports mapped manufacturer rows (spec section 10 flow: upload -> map ->
 * validate -> preview -> import). Shared by the synchronous upload route and
 * the background import worker so both paths behave identically.
 */
export async function importManufacturerRows(
  manufacturerId: string,
  rows: Record<string, string>[],
  fieldMap: FieldMap,
  brandColumn: string | undefined,
  processingRunId?: string
): Promise<ManufacturerImportSummary> {
  const mapped = mapRowsToStandardProducts(rows, fieldMap);
  const brandsSeen = new Set<string>();
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  if (processingRunId) {
    await ProcessingRun.findByIdAndUpdate(processingRunId, {
      status: "running",
      startedAt: new Date(),
      totalItems: mapped.length,
    });
  }

  for (let i = 0; i < mapped.length; i++) {
    const { product, error } = mapped[i];
    const rawRow = rows[i];
    if (error || !product?.mpn) {
      skipped += 1;
      errors.push(`Row ${i + 1}: ${error ?? "Missing MPN"}`);
      continue;
    }

    const brand = brandColumn ? rawRow?.[brandColumn]?.trim() : product.brand;
    if (!brand) {
      skipped += 1;
      errors.push(`Row ${i + 1}: could not determine brand`);
      continue;
    }
    brandsSeen.add(brand);

    const statusRaw = rawRow?.["status"] ?? rawRow?.["Status"];
    const replacementMpn =
      rawRow?.["replacement_mpn"] ?? rawRow?.["Replacement MPN"] ?? rawRow?.["ReplacementMPN"];

    await ManufacturerProduct.findOneAndUpdate(
      { manufacturer: manufacturerId, mpn: product.mpn },
      {
        manufacturer: manufacturerId,
        brand,
        mpn: product.mpn,
        sku: product.sku,
        name: product.name,
        description: product.description,
        gtin: product.gtin,
        price: product.price,
        images: product.images ?? [],
        category: product.category,
        variants: product.variants ?? [],
        weight: product.weight,
        dimensions: product.dimensions,
        material: product.material,
        finish: product.finish,
        fitment: product.fitment,
        availability: product.availability,
        status: normalizeStatus(statusRaw),
        replacementMpn: replacementMpn || undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    imported += 1;

    if (processingRunId && imported % 25 === 0) {
      await ProcessingRun.findByIdAndUpdate(processingRunId, { processedItems: imported });
    }
  }

  await Manufacturer.findByIdAndUpdate(
    manufacturerId,
    { $addToSet: { brands: { $each: Array.from(brandsSeen) } } },
    { upsert: false }
  );

  if (processingRunId) {
    await ProcessingRun.findByIdAndUpdate(processingRunId, {
      status: errors.length > 0 && imported === 0 ? "failed" : "completed",
      processedItems: imported,
      errorCount: errors.length,
      errorMessages: errors.slice(0, 100),
      finishedAt: new Date(),
    });
  }

  return { imported, skipped, errors, brandsSeen: Array.from(brandsSeen) };
}
