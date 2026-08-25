import { OurProduct } from "../models/OurProduct";
import { FieldMap, mapRowsToStandardProducts } from "./columnMappingService";

export interface OurCatalogImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importOurCatalogRows(
  rows: Record<string, string>[],
  fieldMap: FieldMap,
  sourceType: "csv" | "excel"
): Promise<OurCatalogImportSummary> {
  const mapped = mapRowsToStandardProducts(rows, fieldMap);
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < mapped.length; i++) {
    const { product, error } = mapped[i];
    if (error || !product?.sku) {
      skipped += 1;
      errors.push(`Row ${i + 1}: ${error ?? "Missing SKU"}`);
      continue;
    }

    await OurProduct.findOneAndUpdate(
      { sku: product.sku },
      { ...product, sourceType },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    imported += 1;
  }

  return { imported, skipped, errors };
}
