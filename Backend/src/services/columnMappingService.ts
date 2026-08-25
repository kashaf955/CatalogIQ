import { STANDARD_PRODUCT_FIELDS, StandardProduct } from "../types/standardProduct";

export type FieldMap = Partial<Record<keyof StandardProduct, string>>;

export interface MappedRowResult {
  index: number;
  product?: Partial<StandardProduct>;
  error?: string;
}

const NUMERIC_FIELDS = new Set<keyof StandardProduct>(["price"]);
const LIST_FIELDS = new Set<keyof StandardProduct>(["images", "variants"]);

/**
 * Suggests a field map by fuzzy-matching source headers against standard
 * field names, so a manufacturer upload needs less manual setup each time.
 */
export function suggestFieldMap(headers: string[]): FieldMap {
  const map: FieldMap = {};
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: h.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));

  const aliases: Record<string, keyof StandardProduct> = {
    sku: "sku",
    partnumber: "mpn",
    mpn: "mpn",
    manufacturerpartnumber: "mpn",
    productname: "name",
    name: "name",
    title: "name",
    brand: "brand",
    manufacturer: "brand",
    description: "description",
    upc: "gtin",
    ean: "gtin",
    gtin: "gtin",
    price: "price",
    msrp: "price",
    image: "images",
    images: "images",
    imageurl: "images",
    category: "category",
    variant: "variants",
    variants: "variants",
    weight: "weight",
    dimensions: "dimensions",
    material: "material",
    finish: "finish",
    fitment: "fitment",
    availability: "availability",
    stock: "availability",
    status: "availability",
  };

  for (const { original, normalized } of normalizedHeaders) {
    const field = aliases[normalized];
    if (field && !map[field]) {
      map[field] = original;
    }
  }
  return map;
}

export function mapRowsToStandardProducts(
  rows: Record<string, string>[],
  fieldMap: FieldMap
): MappedRowResult[] {
  return rows.map((row, index) => {
    const product: Partial<StandardProduct> = {};
    for (const field of STANDARD_PRODUCT_FIELDS) {
      const sourceColumn = fieldMap[field];
      if (!sourceColumn) continue;
      const raw = row[sourceColumn];
      if (raw === undefined || raw === null || raw === "") continue;
      product[field] = coerceValue(field, raw) as never;
    }

    if (!product.name) {
      return { index, error: "Missing required field: name" };
    }
    return { index, product };
  });
}

function coerceValue(field: keyof StandardProduct, raw: string): unknown {
  if (NUMERIC_FIELDS.has(field)) {
    const parsed = Number(String(raw).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (LIST_FIELDS.has(field)) {
    return String(raw)
      .split(/[|,;]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return String(raw).trim();
}
