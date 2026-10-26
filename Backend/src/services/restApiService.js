const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : undefined;
};

const text = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return String(value.name || value.title || value.value || "").trim();
  }
  return String(value).trim();
};

const first = (item, keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const unwrapList = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.products)) return body.products;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.results)) return body.results;
  return [];
};

const assertHttpUrl = (value) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    const error = new Error("API URL is invalid");
    error.status = 400;
    throw error;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    const error = new Error("API URL must be http or https");
    error.status = 400;
    throw error;
  }
  return parsed.toString();
};

const mapProduct = (item, index) => {
  if (!item || typeof item !== "object") return null;
  const name = text(first(item, ["name", "title", "product", "product_name", "productName"]));
  if (!name) return null;

  const sku =
    text(first(item, ["sku", "item", "item_number", "itemNumber", "part_number"])) ||
    `api-${index + 1}`;

  const images = [];
  const image = first(item, ["image", "image_url", "imageUrl", "thumbnail"]);
  if (typeof image === "string") images.push(image);
  if (Array.isArray(item.images)) {
    for (const entry of item.images) {
      const url = typeof entry === "string" ? entry : entry?.url || entry?.src;
      if (url && !images.includes(url)) images.push(url);
    }
  }

  return {
    sku,
    mpn: text(first(item, ["mpn", "part_number", "partNumber", "manufacturer_part"])),
    gtin: text(first(item, ["gtin", "upc", "ean", "barcode"])),
    name,
    brand: text(first(item, ["brand", "make", "manufacturer", "brand_name"])),
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

const fetchRestProducts = async ({ url, accessToken } = {}) => {
  const endpoint = assertHttpUrl(url);
  const token = text(accessToken);
  const headers = { Accept: "application/json" };
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
    response = await fetch(endpoint, { headers, redirect: "follow" });
  } catch (err) {
    console.error(`[restApi] request failed ${endpoint}: ${err.message}`);
    const error = new Error(`Could not reach API: ${err.message}`);
    error.status = 502;
    throw error;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`[restApi] ${response.status} ${endpoint}`, {
      title: body?.title,
      message: body?.message,
      error: body?.error,
    });
    const detail =
      body?.message || body?.title || body?.error || `API responded ${response.status}`;
    const error = new Error(detail);
    error.status = response.status === 401 || response.status === 403 ? 400 : 502;
    throw error;
  }

  const rows = unwrapList(body)
    .map((item, index) => mapProduct(item, index))
    .filter(Boolean);

  if (rows.length === 0) {
    const keys =
      body && typeof body === "object" && !Array.isArray(body)
        ? Object.keys(body)
        : Array.isArray(body)
          ? [`array:${body.length}`]
          : [typeof body];
    console.error(`[restApi] no products mapped from ${endpoint} keys=${keys.join(",")}`);
    const error = new Error(
      "The API did not return a product list. Use a JSON array, or { data }, { products }, or { items }."
    );
    error.status = 400;
    throw error;
  }

  console.log(`[restApi] mapped ${rows.length} products from ${endpoint}`);
  return rows;
};

module.exports = { fetchRestProducts };
