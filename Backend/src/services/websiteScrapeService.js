const cheerio = require("cheerio");
const { text, normalize, stripStorePrefix } = require("../utils/productCodes");
const {
  throwIfAborted,
  createAbortedError,
} = require("../utils/ingestJobs");

const DELAY_MS = 800;
const MAX_QUERIES = 200;
const MAX_RESULT_LINKS = 5;
const FETCH_TIMEOUT_MS = 15000;

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortedError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortedError());
    };
    signal?.addEventListener("abort", onAbort);
  });

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : undefined;
};

const assertHttpUrl = (value) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    const error = new Error("Competitor website URL is invalid");
    error.status = 400;
    throw error;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    const error = new Error("Competitor website must be http or https");
    error.status = 400;
    throw error;
  }
  return parsed;
};

const toAbsolute = (baseUrl, href) => {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
};

const sameHost = (base, href) => {
  try {
    return new URL(href, base).hostname === new URL(base).hostname;
  } catch {
    return false;
  }
};

const fetchHtml = async (url, signal) => {
  throwIfAborted(signal);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "CatalogIQ/1.0 (catalog ingest)",
      },
    });
    throwIfAborted(signal);
    if (!response.ok) return "";
    const type = String(response.headers.get("content-type") || "");
    if (type && !type.includes("html") && !type.includes("xml") && !type.includes("text")) {
      return "";
    }
    return await response.text();
  } catch (error) {
    throwIfAborted(signal);
    if (error?.code === "INGEST_ABORTED") throw error;
    return "";
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};

const jsonLdNodes = ($) => {
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (item?.["@graph"]) nodes.push(...item["@graph"]);
        else nodes.push(item);
      }
    } catch {
      // ignore invalid JSON-LD
    }
  });
  return nodes;
};

const typeOf = (node) => {
  const value = node?.["@type"];
  return (Array.isArray(value) ? value : [value]).map((item) =>
    String(item || "").toLowerCase()
  );
};

const offerOf = (node) => {
  const offers = node?.offers;
  if (Array.isArray(offers)) return offers[0] || {};
  return offers || {};
};

const searchUrlsFor = (origin, queryText) => {
  const q = encodeURIComponent(queryText);
  return [
    `${origin}/catalogsearch/result/?q=${q}`,
    `${origin}/search.php?search_query=${q}`,
    `${origin}/search?search_query=${q}`,
    `${origin}/search?q=${q}`,
    `${origin}/search?query=${q}`,
  ];
};

const uniqueTerms = (...values) => {
  const terms = [];
  for (const value of values) {
    const next = text(value);
    if (!next) continue;
    if (!terms.some((item) => normalize(item) === normalize(next))) {
      terms.push(next);
    }
  }
  return terms;
};

const searchTermsFor = (query) =>
  uniqueTerms(
    query?.sku,
    stripStorePrefix(query?.sku),
    query?.mpn,
    stripStorePrefix(query?.mpn)
  );

const codesOf = (query) =>
  uniqueTerms(
    query?.sku,
    stripStorePrefix(query?.sku),
    query?.mpn,
    stripStorePrefix(query?.mpn)
  ).map(normalize);

const looksLikeMatch = (product, query) => {
  const wanted = codesOf(query);
  const found = uniqueTerms(
    product.sku,
    stripStorePrefix(product.sku),
    product.mpn,
    stripStorePrefix(product.mpn)
  ).map(normalize);
  return wanted.some((code) => found.includes(code));
};

const DESCRIPTION_SELECTORS = [
  ".product.attribute.description .value",
  ".product.attribute.description",
  "[itemprop='description']",
  "#description .value",
  "#description",
  ".product.info.detailed .product.attribute.description",
  ".product.data.items .description .value",
  ".product-description",
  ".product-single__description",
  ".product__description",
  "#tab-description",
  ".woocommerce-Tabs-panel--description",
  ".woocommerce-product-details__short-description",
  ".product.attribute.overview .value",
];

const innerHtml = (node) => {
  if (!node || !node.length) return "";
  const clone = node.first().clone();
  clone.find("script, style, noscript, iframe").remove();
  return (clone.html() || clone.text() || "").trim();
};

const plainLength = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;

const extractDescription = ($, productNode) => {
  const candidates = [
    text(productNode?.description),
    ...DESCRIPTION_SELECTORS.map((selector) => innerHtml($(selector))),
    text($('meta[property="og:description"]').attr("content")),
    text($('meta[name="description"]').attr("content")),
  ].filter(Boolean);

  let best = "";
  for (const candidate of candidates) {
    if (plainLength(candidate) > plainLength(best)) best = candidate;
  }
  return best;
};

const extractProduct = (html, pageUrl, query) => {
  const $ = cheerio.load(html);
  const productNode = jsonLdNodes($).find((node) => typeOf(node).includes("product"));
  const offer = offerOf(productNode);
  const name =
    text(productNode?.name) ||
    text($('meta[property="og:title"]').attr("content")) ||
    text($("h1").first().text());
  if (!name) return null;

  const sku =
    text(productNode?.sku) ||
    text(query.sku) ||
    `WEB-${normalize(query.sku || query.mpn || pageUrl).slice(0, 40)}`;
  const images = [];
  const image = productNode?.image;
  if (typeof image === "string") images.push(image);
  else if (Array.isArray(image)) {
    for (const item of image) {
      if (typeof item === "string") images.push(item);
      else if (item?.url) images.push(item.url);
    }
  }
  const ogImage = text($('meta[property="og:image"]').attr("content"));
  if (ogImage && !images.includes(ogImage)) images.push(ogImage);

  return {
    sku,
    mpn: text(productNode?.mpn) || text(query.mpn),
    gtin: text(productNode?.gtin || productNode?.gtin13 || productNode?.gtin12),
    name,
    brand:
      text(productNode?.brand?.name) ||
      text(productNode?.brand) ||
      text(query.brand),
    description: extractDescription($, productNode),
    price: toNumber(offer.price || offer.lowPrice || productNode?.price),
    currency: text(offer.priceCurrency) || "USD",
    images,
    category: text(productNode?.category),
    availability: text(offer.availability).replace(/^.*\//, ""),
    status: "active",
    sourceUrl: pageUrl,
    attributes: {
      querySku: text(query.sku),
      queryMpn: text(query.mpn),
      queryPartNumber: stripStorePrefix(query.sku) || text(query.mpn),
      companyProductId: query._id || query.id || null,
    },
  };
};

const findResultLinks = (html, pageUrl, origin) => {
  const $ = cheerio.load(html);
  const links = new Set();

  for (const node of jsonLdNodes($)) {
    if (!typeOf(node).includes("itemlist")) continue;
    for (const item of node.itemListElement || []) {
      const href = item?.url || item?.item?.url;
      const absolute = toAbsolute(pageUrl, href);
      if (absolute && sameHost(origin, absolute)) links.add(absolute);
    }
  }

  $("a.product-item-link, a.product-item-photo").each((_, el) => {
    const absolute = toAbsolute(pageUrl, $(el).attr("href"));
    if (absolute && sameHost(origin, absolute)) links.add(absolute);
  });

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const absolute = toAbsolute(pageUrl, href);
    if (!absolute || !sameHost(origin, absolute)) return;
    if (
      /\/(product|products|p|dp|catalog\/product)\b/i.test(absolute) ||
      /[?&](?:product_id|id_product)=/i.test(absolute)
    ) {
      links.add(absolute);
    }
  });

  return [...links];
};

const searchOne = async (origin, query, signal) => {
  const terms = searchTermsFor(query);
  if (terms.length === 0) return null;

  for (const term of terms) {
    for (const searchUrl of searchUrlsFor(origin, term)) {
      throwIfAborted(signal);
      const html = await fetchHtml(searchUrl, signal);
      if (!html) continue;

      const direct = extractProduct(html, searchUrl, query);
      if (direct && looksLikeMatch(direct, query)) return direct;

      const links = findResultLinks(html, searchUrl, origin).slice(
        0,
        MAX_RESULT_LINKS
      );
      for (const link of links) {
        await sleep(DELAY_MS, signal);
        const pageHtml = await fetchHtml(link, signal);
        if (!pageHtml) continue;
        const product = extractProduct(pageHtml, link, query);
        if (product && looksLikeMatch(product, query)) return product;
      }

      await sleep(DELAY_MS, signal);
    }
  }

  return null;
};

const fetchWebsiteProducts = async ({ url, queries = [], signal } = {}) => {
  const parsed = assertHttpUrl(url);
  const list = (Array.isArray(queries) ? queries : []).slice(0, MAX_QUERIES);

  if (list.length === 0) {
    const error = new Error(
      "Ingest the company catalog first. Competitor scrape searches those products only."
    );
    error.status = 400;
    throw error;
  }

  const products = [];
  try {
    for (const query of list) {
      throwIfAborted(signal, products);
      const found = await searchOne(parsed.origin, query, signal);
      if (found) products.push(found);
      await sleep(DELAY_MS, signal);
    }
  } catch (error) {
    if (error?.code === "INGEST_ABORTED") {
      error.products = products;
    }
    throw error;
  }

  return products;
};

module.exports = { fetchWebsiteProducts };
