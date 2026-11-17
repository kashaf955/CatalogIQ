import XLSX from "xlsx";
import { generatedSku } from "../utils/productCodes";
import { HttpError } from "../utils/httpError";
import type { ProductInput } from "../types/domain";

type Cells = Record<string, unknown>;

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "product", "product name", "title", "item name", "description name"],
  sku: ["sku", "item", "item number", "item #", "item no", "part sku"],
  mpn: ["mpn", "part number", "part #", "part no", "manufacturer part", "oem"],
  gtin: ["gtin", "upc", "ean", "barcode"],
  brand: ["brand", "make"],
  manufacturer: ["manufacturer"],
  description: ["description", "details", "long description"],
  price: ["price", "cost", "list price", "unit price"],
  weight: ["weight", "wt"],
  width: ["width", "w"],
  height: ["height", "h"],
  depth: ["depth", "length", "l"],
  fitment: ["fitment", "fits", "compatibility", "vehicle fitment"],
  year: ["year", "years"],
  model: ["model"],
  trim: ["trim", "submodel"],
  category: ["category", "cat"],
  availability: ["availability", "stock", "qty", "quantity"],
};

const normalizeHeader = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ");

const pick = (row: Cells, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return "";
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : undefined;
};

const mapRow = (raw: Cells, index: number): ProductInput | null => {
  const row: Cells = {};
  for (const [key, value] of Object.entries(raw)) {
    row[normalizeHeader(key)] = value;
  }

  const aliased: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    aliased[field] = pick(row, aliases);
  }

  const name = aliased.name || aliased.description;
  if (!name) return null;

  const sku =
    aliased.sku ||
    generatedSku({
      name,
      brand: aliased.brand || aliased.manufacturer,
      mpn: aliased.mpn,
      gtin: aliased.gtin,
    });
  const fitment =
    aliased.fitment ||
    [aliased.year, aliased.manufacturer || aliased.brand, aliased.model, aliased.trim]
      .filter(Boolean)
      .join(" ");

  return {
    sku,
    mpn: aliased.mpn,
    gtin: aliased.gtin,
    name,
    brand: aliased.brand || aliased.manufacturer,
    description: aliased.description,
    price: toNumber(aliased.price),
    weight: toNumber(aliased.weight),
    width: toNumber(aliased.width),
    height: toNumber(aliased.height),
    depth: toNumber(aliased.depth),
    fitment,
    category: aliased.category,
    availability: aliased.availability,
    status: "active",
    attributes: {
      excelKey: sku,
      excelRow: index + 2,
    },
  };
};

const parseExcelProducts = (buffer: Buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    const error = new HttpError("The spreadsheet has no sheets", 400);
    throw error;
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new HttpError("The spreadsheet has no sheets", 400);
  const rows = XLSX.utils.sheet_to_json<Cells>(sheet, {
    defval: "",
    raw: false,
  });

  const products: ProductInput[] = [];
  rows.forEach((row, index) => {
    const mapped = mapRow(row, index);
    if (mapped) products.push(mapped);
  });

  if (products.length === 0) {
    const error = new HttpError("No product rows found. Include a Name or Product column.", 400);
    throw error;
  }

  return products;
};

export { parseExcelProducts };
