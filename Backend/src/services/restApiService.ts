import { safeFetch } from "../utils/safeFetch";
import { generatedSku } from "../utils/productCodes";
import { HttpError, IngestAbortedError, errorMessage } from "../utils/httpError";
import { field, fieldText, isObject, type JsonObject } from "../utils/json";
import type { ProductInput } from "../types/domain";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : undefined;
};

const text = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return String(field(value, "name") || field(value, "title") || field(value, "value") || "").trim();
  }
  return String(value).trim();
};

const first = (item: JsonObject, keys: string[]): unknown => {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const unwrapList = (body: unknown): unknown[] => {
  if (Array.isArray(body)) return body;
  for (const key of ["data", "products", "items", "results"]) {
    const list = field(body, key);
    if (Array.isArray(list)) return list;
  }
  return [];
};

const assertHttpUrl = (value: unknown) => {
  let parsed: URL;
  try {
    parsed = new URL(String(value));
  } catch {
    throw new HttpError("API URL is invalid", 400);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError("API URL must be http or https", 400);
  }
  return parsed.toString();
};

const mapProduct = (item: unknown, index: number): ProductInput | null => {
  if (!isObject(item)) return null;
  const name = text(first(item, ["name", "title", "product", "product_name", "productName"]));
  if (!name) return null;

  const mpn = text(first(item, ["mpn", "part_number", "partNumber", "manufacturer_part"]));
  const gtin = text(first(item, ["gtin", "upc", "ean", "barcode"]));
  const brand = text(first(item, ["brand", "make", "manufacturer", "brand_name"]));
  const sku =
    text(first(item, ["sku", "item", "item_number", "itemNumber", "part_number"])) ||
    generatedSku({ name, brand, mpn, gtin });

  const images: string[] = [];
  const image = first(item, ["image", "image_url", "imageUrl", "thumbnail"]);
  if (typeof image === "string") images.push(image);
  if (Array.isArray(item.images)) {
    for (const entry of item.images) {
      const url = typeof entry === "string" ? entry : fieldText(entry, "url") || fieldText(entry, "src");
      if (url && !images.includes(url)) images.push(url);
    }
  }

  return {
    sku,
    mpn,
    gtin,
    name,
    brand,
    description: text(first(item, ["description", "details", "body"])),
    price: toNumber(first(item, ["price", "sale_price", "calculated_price", "cost"])),
    currency: text(first(item, ["currency", "currency_code"])) || "USD",
    weight: toNumber(first(item, ["weight"])),
    width: toNumber(first(item, ["width"])),
    height: toNumber(first(item, ["height"])),
    depth: toNumber(first(item, ["depth", "length"])),
    fitment: text(first(item, ["fitment", "fits", "compatibility"])),
    images,
    category: text(first(item, ["category", "category_name"])),
    availability: text(first(item, ["availability", "stock", "inventory"])),
    status: "active",
    sourceUrl: text(first(item, ["url", "sourceUrl", "permalink"])),
    attributes: {
      apiIndex: index + 1,
    },
  };
};

interface RestFetchOptions {
  url?: string;
  accessToken?: string;
  signal?: AbortSignal;
}

const fetchRestProducts = async ({ url, accessToken, signal }: RestFetchOptions = {}) => {
  const endpoint = assertHttpUrl(url);
  const token = text(accessToken);
  const headers: Record<string, string> = {};
  if (token) {
    if (/bigcommerce\.com/i.test(endpoint)) {
      headers["X-Auth-Token"] = token;
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  console.log(`[restApi] GET ${endpoint} auth=${token ? "yes" : "no"}`);

  let response;
  try {
    response = await safeFetch(endpoint, {
      headers,
      publicHeaders: { Accept: "application/json" },
      signal,
    });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      throw new IngestAbortedError<ProductInput>([]);
    }
    console.error(`[restApi] request failed ${endpoint}: ${errorMessage(err)}`);
    throw new HttpError(`Could not reach API: ${errorMessage(err)}`, 502);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`[restApi] ${response.status} ${endpoint}`, {
      title: field(body, "title"),
      message: field(body, "message"),
      error: field(body, "error"),
    });
    const detail =
      fieldText(body, "message") ||
      fieldText(body, "title") ||
      fieldText(body, "error") ||
      `API responded ${response.status}`;
    throw new HttpError(detail, response.status === 401 || response.status === 403 ? 400 : 502);
  }

  const rows = unwrapList(body)
    .map((item, index) => mapProduct(item, index))
    .filter((row) => row !== null);

  if (rows.length === 0) {
    const keys = isObject(body)
      ? Object.keys(body)
      : Array.isArray(body)
        ? [`array:${body.length}`]
        : [typeof body];
    console.error(`[restApi] no products mapped from ${endpoint} keys=${keys.join(",")}`);
    throw new HttpError(
      "The API did not return a product list. Use a JSON array, or { data }, { products }, or { items }.",
      400
    );
  }

  console.log(`[restApi] mapped ${rows.length} products from ${endpoint}`);
  return rows;
};

export { fetchRestProducts };
