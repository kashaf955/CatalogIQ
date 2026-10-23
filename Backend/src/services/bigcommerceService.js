const STORE_HASH = /^[a-z0-9]+$/i;

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const mapName = (lookup, id) => {
  if (id === null || id === undefined || id === "") return "";
  return lookup.get(Number(id)) || "";
};

const customFieldValue = (fields, names) => {
  const wanted = names.map((name) => name.toLowerCase());
  const match = fields.find((field) =>
    wanted.includes(String(field.name || "").trim().toLowerCase())
  );
  return String(match?.value || "").trim();
};

const mapFitment = (fields) => {
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

const mapCategory = (item, categories) => {
  const ids = Array.isArray(item.categories) ? item.categories : [];
  const names = ids.map((id) => mapName(categories, id)).filter(Boolean);
  return names[0] || "";
};

const mapDescription = (item, fields) => {
  const candidates = [
    item.description,
    item.meta_description,
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

const mapProduct = (item, brands, categories) => {
  const images = [];
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

const bigcommerceRequest = async (storeHash, accessToken, path) => {
  const response = await fetch(
    `https://api.bigcommerce.com/stores/${storeHash}${path}`,
    {
      headers: {
        "X-Auth-Token": accessToken,
        Accept: "application/json",
      },
    }
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`[bigcommerce] ${response.status} ${path}`, {
      title: body.title,
      message: body.message,
    });
    const detail = body.title || body.message || `BigCommerce ${response.status}`;
    const error = new Error(detail);
    error.status = response.status === 401 || response.status === 403 ? 400 : 502;
    throw error;
  }
  return body;
};

const fetchPagedMap = async (storeHash, accessToken, path, key = "name") => {
  const lookup = new Map();
  let page = 1;

  while (page <= 20) {
    const separator = path.includes("?") ? "&" : "?";
    const result = await bigcommerceRequest(
      storeHash,
      accessToken,
      `${path}${separator}limit=250&page=${page}`
    );
    for (const item of result.data || []) {
      lookup.set(Number(item.id), item[key]);
    }
    const totalPages = result.meta?.pagination?.total_pages || 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return lookup;
};

const fetchBigCommerceProducts = async ({ storeHash, accessToken }) => {
  const hash = String(storeHash || "").trim();
  const token = String(accessToken || "").trim();

  if (!hash || !STORE_HASH.test(hash)) {
    const error = new Error("A valid BigCommerce store hash is required");
    error.status = 400;
    throw error;
  }
  if (!token) {
    const error = new Error("A BigCommerce access token is required");
    error.status = 400;
    throw error;
  }

  const [brands, categories] = await Promise.all([
    fetchPagedMap(hash, token, "/v3/catalog/brands"),
    fetchPagedMap(hash, token, "/v3/catalog/categories"),
  ]);
  const products = [];
  let page = 1;

  while (page <= 100) {
    const result = await bigcommerceRequest(
      hash,
      token,
      `/v3/catalog/products?limit=250&page=${page}&include=images,primary_image,custom_fields&include_fields=name,sku,mpn,gtin,upc,brand_id,description,price,calculated_price,weight,width,height,depth,categories,availability,is_visible,custom_url,warranty,search_keywords,meta_description,page_title`
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
      products.push(mapProduct(item, brands, categories));
    }
    const totalPages = result.meta?.pagination?.total_pages || 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return products;
};

module.exports = { fetchBigCommerceProducts };
