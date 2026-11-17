import XLSX from "xlsx";
import CatalogSource from "../models/catalogSourceModel";
import type { QueryFilter } from "mongoose";
import Product, { type ProductRecord } from "../models/productModel";
import Match, { hasBothProducts, type MatchRecord, type PopulatedMatch } from "../models/matchModel";
import { isMatchAgainst, type Id } from "../types/domain";
import { isMatchableProduct } from "../utils/productMatchability";
import { realSku } from "../utils/productCodes";
import { HttpError } from "../utils/httpError";

const SCOPES = ["accepted", "pending", "all"] as const;
const FORMATS = ["csv", "xlsx"] as const;

export type ExportScope = (typeof SCOPES)[number];
export type ExportFormat = (typeof FORMATS)[number];

const isScope = (value: unknown): value is ExportScope => SCOPES.includes(value as ExportScope);
const isFormat = (value: unknown): value is ExportFormat => FORMATS.includes(value as ExportFormat);

type Row = Record<string, string | number>;

export interface ExportRequest {
  tenantId: Id;
  sourceId?: string;
  scope: unknown;
  format: unknown;
  against?: unknown;
}
const MAX_ROWS = 20000;
const PRODUCT_FIELDS =
  "sku mpn gtin name brand description price currency availability category fitment sourceUrl weight";

const plain = (value: unknown) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const money = (value: unknown): number | "" =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 100) / 100
    : "";

const fileSlug = (name: string) =>
  String(name || "catalog")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "catalog";

// Spreadsheet apps run CSV cells starting with these as formulas, and these
// values can come from scraped competitor pages.
const safeCsvCell = (value: unknown) =>
  typeof value === "string" && /^\s*[=+\-@]/.test(value) ? `'${value}` : value;

const safeCsvRow = (row: Row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, safeCsvCell(value)])
  );

const toProductRow = (product: ProductRecord): Row => ({
  SKU: realSku(product),
  MPN: product.mpn || "",
  GTIN: product.gtin || "",
  Name: product.name || "",
  Brand: product.brand || "",
  Price: money(product.price),
  Currency: product.currency || "",
  Availability: product.availability || "",
  Category: product.category || "",
  Fitment: product.fitment || "",
  Description: plain(product.description),
  URL: product.sourceUrl || "",
});

const toMatchRow = (match: PopulatedMatch): Row => {
  const ours = match.ourProductId;
  const theirs = match.theirProductId;
  const ourPrice = money(ours.price);
  const theirPrice = money(theirs.price);
  const gap =
    ourPrice !== "" && theirPrice !== ""
      ? Math.round((ourPrice - theirPrice) * 100) / 100
      : "";

  return {
    "Our SKU": realSku(ours),
    "Our name": ours.name || "",
    "Our MPN": ours.mpn || "",
    "Our brand": ours.brand || "",
    "Our price": ourPrice,
    "Our availability": ours.availability || "",
    "Their SKU": realSku(theirs),
    "Their name": theirs.name || "",
    "Their price": theirPrice,
    "Their availability": theirs.availability || "",
    "Their URL": theirs.sourceUrl || "",
    Gap: gap,
    Score: match.score,
    Reason: match.reason || "",
    Status: match.status,
  };
};

const encodeWorkbook = (rows: Row[], format: ExportFormat, filename: string) => {
  if (format === "csv") {
    const sheet = XLSX.utils.json_to_sheet(rows.map(safeCsvRow));
    return {
      filename: `${filename}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: XLSX.utils.sheet_to_csv(sheet),
    };
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Export");

  return {
    filename: `${filename}.xlsx`,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  };
};

const buildExport = async ({ tenantId, sourceId, scope, format, against }: ExportRequest) => {
  if (!sourceId) {
    const error = new HttpError("Choose a catalog to export", 400);
    throw error;
  }
  if (!isScope(scope)) {
    const error = new HttpError("Choose accepted, pending, or all products", 400);
    throw error;
  }
  if (!isFormat(format)) {
    const error = new HttpError("Choose CSV or Excel", 400);
    throw error;
  }

  const catalog = await CatalogSource.findOne({
    _id: sourceId,
    tenantId,
    isDeleted: false,
  }).lean();
  if (!catalog) {
    const error = new HttpError("Catalog not found", 404);
    throw error;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `catalogiq-${fileSlug(catalog.name)}-${scope}-${stamp}`;

  if (scope === "all") {
    const products = await Product.find({
      tenantId,
      sourceId: catalog._id,
      isDeleted: false,
    })
      .select(PRODUCT_FIELDS)
      .sort({ sku: 1, name: 1 })
      .limit(MAX_ROWS)
      .lean();
    if (products.length === 0) {
      const error = new HttpError("This catalog has no products to export", 400);
      throw error;
    }
    return encodeWorkbook(products.map(toProductRow), format, filename);
  }

  const matchAgainst = isMatchAgainst(against)
    ? against
    : catalog.type === "manufacturer"
      ? "manufacturer"
      : "competitor";

  const filter: QueryFilter<MatchRecord> = {
    tenantId,
    against: matchAgainst,
    status: scope,
  };
  if (catalog.type === "our_catalog") {
    // Filter after populate so we can keep one query shape.
  } else {
    filter.theirSourceId = catalog._id;
  }

  const matches = await Match.find(filter)
    .sort({ score: -1, createdAt: -1 })
    .limit(MAX_ROWS)
    .populate<{ ourProductId: ProductRecord | null; theirProductId: ProductRecord | null }>({
      path: "ourProductId",
      select: PRODUCT_FIELDS + " sourceId",
      match: { isDeleted: false },
    })
    .populate({
      path: "theirProductId",
      select: PRODUCT_FIELDS,
      match: { isDeleted: false },
    })
    .lean();

  const rows = matches
    .filter(hasBothProducts)
    .filter((match) => {
      if (!isMatchableProduct(match.theirProductId)) return false;
      if (catalog.type === "our_catalog") {
        return String(match.ourProductId.sourceId) === String(catalog._id);
      }
      return true;
    })
    .map(toMatchRow);

  if (rows.length === 0) {
    const error = new HttpError(scope === "accepted"
        ? "No accepted matches to export for this catalog"
        : "No pending matches to export for this catalog", 400);
    throw error;
  }

  return encodeWorkbook(rows, format, filename);
};

export { buildExport, SCOPES, FORMATS };
