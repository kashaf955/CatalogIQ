import { throwIfAborted, createAbortedError } from "../utils/ingestJobs";
import { HttpError, IngestAbortedError } from "../utils/httpError";
import type { ProductInput } from "../types/domain";

const STORE_HASH = /^[a-z0-9]+$/i;

// The parts of BigCommerce's v3 catalog API responses that are read here.
// Every field is optional: stores differ, and include_fields limits the set.
interface BcCustomField {
  name?: string;
  value?: string;
}

interface BcImage {
  url_standard?: string;
}

interface BcProduct {
  id?: number;
  name?: string;
  sku?: string;
  mpn?: string;
  gtin?: string;
  upc?: string;
  brand_id?: number | null;
  description?: string;
  meta_description?: string;
  open_graph_description?: string;
  availability_description?: string;
  warranty?: string;
  price?: number;
  calculated_price?: number;
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
  categories?: number[];
  availability?: string;
  is_visible?: boolean;
  custom_url?: { url?: string };
  primary_image?: BcImage | null;
  images?: BcImage[];
  custom_fields?: BcCustomField[];
}

interface BcPage<T> {
  data?: T[];
  meta?: { pagination?: { total_pages?: number } };
  // Present on error responses.
  title?: string;
  message?: string;
}

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const mapName = (lookup: Map<number, string>, id: unknown) => {
  if (id === null || id === undefined || id === "") return "";
  return lookup.get(Number(id)) || "";
};

const customFieldValue = (fields: BcCustomField[], names: string[]) => {
  const wanted = names.map((name) => name.toLowerCase());
  const match = fields.find((field) =>
    wanted.includes(String(field.name || "").trim().toLowerCase())
  );
  return String(match?.value || "").trim();
};

const mapFitment = (fields: BcCustomField[]) => {
  const direct = customFieldValue(fields, [
    "fitment",
    "vehicle fitment",
    "fits",
    "compatibility",
  ]);
  if (direct) return direct;

  const year = customFieldValue(fields, ["year", "years"]);
  const make = customFieldValue(fields, ["make", "manufacturer"]);
  const model = customFieldValue(fields, ["model"]);
  const trim = customFieldValue(fields, ["trim", "submodel"]);
  return [year, make, model, trim].filter(Boolean).join(" ");
};

const mapCategory = (item: BcProduct, categories: Map<number, string>) => {
  const ids = Array.isArray(item.categories) ? item.categories : [];
  const names = ids.map((id) => mapName(categories, id)).filter(Boolean);
  return names[0] || "";
};

const mapDescription = (item: BcProduct, fields: BcCustomField[]) => {
  const candidates = [
    item.description,
    item.meta_description,
    item.open_graph_description,
    item.availability_description,
    item.warranty,
    customFieldValue(fields, [
      "description",
      "long description",
      "details",
      "product description",
    ]),
  ];
  const match = candidates.find((value) => String(value || "").trim());
  return match ? String(match) : "";
};

const mapProduct = (
  item: BcProduct & { name: string },
  brands: Map<number, string>,
  categories: Map<number, string>
): ProductInput => {
  const images: string[] = [];
  if (item.primary_image?.url_standard) {
    images.push(item.primary_image.url_standard);
  }
  for (const image of item.images || []) {
    if (image.url_standard && !images.includes(image.url_standard)) {
      images.push(image.url_standard);
    }
  }

  const fields = item.custom_fields || [];
  const sku = String(item.sku || "").trim() || `bc-${item.id}`;
  const description = mapDescription(item, fields);

  return {
    sku,
    mpn: item.mpn || "",
    gtin: item.gtin || item.upc || "",
    name: item.name,
    brand:
      mapName(brands, item.brand_id) ||
      customFieldValue(fields, ["brand"]),
    description,
    price: toNumber(item.calculated_price ?? item.price),
    currency: "USD",
    weight: toNumber(item.weight),
    width: toNumber(item.width),
    height: toNumber(item.height),
    depth: toNumber(item.depth),
    fitment: mapFitment(fields),
    images,
    category: mapCategory(item, categories),
    availability: item.availability || "",
    status: item.is_visible === false ? "inactive" : "active",
    sourceUrl: item.custom_url?.url || "",
    attributes: {
      bigcommerceId: item.id,
      brandId: item.brand_id || null,
      customFields: fields.map((field) => ({
        name: field.name,
        value: field.value,
      })),
    },
  };
};

const bigcommerceRequest = async <T>(
  storeHash: string,
  accessToken: string,
  path: string,
  signal?: AbortSignal
): Promise<BcPage<T>> => {
  throwIfAborted(signal);
  let response;
  try {
    response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}${path}`,
      {
        signal,
        headers: {
          "X-Auth-Token": accessToken,
          Accept: "application/json",
        },
      }
    );
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw createAbortedError();
    }
    throw error;
  }

  const body = (await response.json().catch(() => ({}))) as BcPage<T>;
  if (!response.ok) {
    console.error(`[bigcommerce] ${response.status} ${path}`, {
      title: body.title,
      message: body.message,
    });
    const detail = body.title || body.message || `BigCommerce ${response.status}`;
    throw new HttpError(detail, response.status === 401 || response.status === 403 ? 400 : 502);
  }
  return body;
};

// id -> name for brands or categories, read page by page.
const fetchPagedMap = async (
  storeHash: string,
  accessToken: string,
  path: string,
  key: "name" = "name",
  signal?: AbortSignal
) => {
  const lookup = new Map<number, string>();
  let page = 1;

  while (page <= 20) {
    throwIfAborted(signal);
    const separator = path.includes("?") ? "&" : "?";
    const result = await bigcommerceRequest<{ id?: number; name?: string }>(
      storeHash,
      accessToken,
      `${path}${separator}limit=250&page=${page}`,
      signal
    );
    for (const item of result.data || []) {
      lookup.set(Number(item.id), item[key] ?? "");
    }
    const totalPages = result.meta?.pagination?.total_pages || 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return lookup;
};

interface BigCommerceFetchOptions {
  storeHash?: string;
  accessToken?: string;
  signal?: AbortSignal;
}

const fetchBigCommerceProducts = async ({
  storeHash,
  accessToken,
  signal,
}: BigCommerceFetchOptions) => {
  const hash = String(storeHash || "").trim();
  const token = String(accessToken || "").trim();

  if (!hash || !STORE_HASH.test(hash)) {
    throw new HttpError("A valid BigCommerce store hash is required", 400);
  }
  if (!token) {
    throw new HttpError("A BigCommerce access token is required", 400);
  }

  const [brands, categories] = await Promise.all([
    fetchPagedMap(hash, token, "/v3/catalog/brands", "name", signal),
    fetchPagedMap(hash, token, "/v3/catalog/categories", "name", signal),
  ]);
  const products: ProductInput[] = [];
  let page = 1;

  try {
    while (page <= 100) {
      throwIfAborted(signal, products);
      const result = await bigcommerceRequest<BcProduct>(
        hash,
        token,
        `/v3/catalog/products?limit=250&page=${page}&include=images,primary_image,custom_fields&include_fields=name,sku,mpn,gtin,upc,brand_id,description,price,calculated_price,weight,width,height,depth,categories,availability,availability_description,is_visible,custom_url,warranty,search_keywords,meta_description,page_title,open_graph_description`,
        signal
      );
      for (const item of result.data || []) {
        if (!item?.name) continue;
        if (products.length === 0) {
          console.log("[bigcommerce] sample keys", Object.keys(item));
          console.log(
            "[bigcommerce] description length",
            String(item.description || "").length
          );
        }
        products.push(mapProduct({ ...item, name: item.name }, brands, categories));
      }
      const totalPages = result.meta?.pagination?.total_pages || 1;
      if (page >= totalPages) break;
      page += 1;
    }
  } catch (error) {
    // Keep what was read before the person stopped the ingest.
    if (error instanceof IngestAbortedError) {
      error.products = products;
    }
    throw error;
  }

  return products;
};

export { fetchBigCommerceProducts };
