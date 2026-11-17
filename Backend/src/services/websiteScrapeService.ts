// cheerio 1.x has no default export; a default import is undefined at runtime.
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

// What $(selector) returns.
type Selection = ReturnType<CheerioAPI>;
import { assertPublicUrl, safeFetch } from "../utils/safeFetch";
import { text, normalize } from "../utils/productCodes";
import { throwIfAborted, createAbortedError } from "../utils/ingestJobs";
import { isSearchResultUrl, isSearchResultName } from "../utils/productMatchability";
import { HttpError, IngestAbortedError } from "../utils/httpError";
import { field, fieldText, isObject, type JsonObject } from "../utils/json";
import type { ProductInput } from "../types/domain";

const DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 15000;
const MAX_SITEMAPS = 20;
const MAX_SITEMAP_URLS = 8000;
const MAX_LISTING_PAGES = 60;
const MAX_PRODUCT_PAGES = 1500;
const BATCH_SIZE = 25;

const SKIP_PATH =
  /\/(checkout|cart|customer|account|wishlist|catalogsearch|search|contact|blog|privacy|login|register|admin|rest\/|graphql)(\/|\?|$)/i;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
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

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : undefined;
};

const assertHttpUrl = (value: unknown) => {
  let parsed: URL;
  try {
    parsed = new URL(String(value));
  } catch {
    const error = new HttpError("Competitor website URL is invalid", 400);
    throw error;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    const error = new HttpError("Competitor website must be http or https", 400);
    throw error;
  }
  return parsed;
};

const toAbsolute = (baseUrl: string, href: unknown) => {
  try {
    return new URL(String(href ?? ""), baseUrl).toString();
  } catch {
    return "";
  }
};

const sameHost = (base: string, href: string) => {
  try {
    return new URL(href, base).hostname === new URL(base).hostname;
  } catch {
    return false;
  }
};

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
};

const fetchPage = async (url: string, signal?: AbortSignal) => {
  throwIfAborted(signal);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await safeFetch(url, {
      signal: controller.signal,
      publicHeaders: {
        Accept: "text/html,application/xhtml+xml,application/xml,text/xml",
        "User-Agent": "CatalogIQ/1.0 (catalog ingest)",
      },
    });
    throwIfAborted(signal);
    if (!response.ok) return { html: "", finalUrl: url };
    const type = String(response.headers.get("content-type") || "");
    if (
      type &&
      !type.includes("html") &&
      !type.includes("xml") &&
      !type.includes("text")
    ) {
      return { html: "", finalUrl: response.url || url };
    }
    return {
      html: await response.text(),
      finalUrl: response.url || url,
    };
  } catch (error) {
    throwIfAborted(signal);
    if (error instanceof IngestAbortedError) throw error;
    return { html: "", finalUrl: url };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};

const locTags = (xml: string) =>
  [...String(xml).matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) =>
    text(match[1])
  );

const sitemapUrlEntries = (xml: string) =>
  [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((match) => {
    const block = match[1];
    return {
      loc: text((block.match(/<loc>\s*([^<]+)/i) || [])[1]),
      priority: Number((block.match(/<priority>\s*([^<]+)/i) || [])[1]) || 0,
      images: (block.match(/<image:image>/gi) || []).length,
    };
  });

const isLikelyProductSitemapEntry = (entry: ReturnType<typeof sitemapUrlEntries>[number]) =>
  Boolean(entry?.loc) && (entry.images > 0 || entry.priority >= 1);

const parseRobots = (body: string) => {
  const lines = String(body || "").split(/\r?\n/);
  let applies = false;
  const disallows: string[] = [];
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const field = String(key || "").toLowerCase();
    if (field === "user-agent") {
      applies = value === "*" || /catalogiq/i.test(value);
    } else if (applies && field === "disallow" && value) {
      disallows.push(value);
    }
  }
  return (url: string) => {
    const path = pathOf(url);
    return !disallows.some(
      (rule) => rule !== "" && (rule === "/" || path.startsWith(rule))
    );
  };
};

// Whether robots.txt lets us fetch a URL.
type RobotsCheck = (url: string) => boolean;

const loadRobots = async (origin: string, signal?: AbortSignal): Promise<RobotsCheck> => {
  const { html } = await fetchPage(`${origin}/robots.txt`, signal);
  if (!html) return () => true;
  return parseRobots(html);
};

const isSkippedUrl = (url: string) =>
  !url ||
  isSearchResultUrl(url) ||
  SKIP_PATH.test(pathOf(url)) ||
  /^(mailto:|tel:|javascript:)/i.test(url);

const isSitemapUrl = (url: string) => /\.xml($|\?)/i.test(url) || /sitemap/i.test(url);

// JSON-LD blocks (schema.org data) embedded in the page; the shape varies by site.
const jsonLdNodes = ($: CheerioAPI) => {
  const nodes: JsonObject[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        const graph = field(item, "@graph");
        if (Array.isArray(graph)) nodes.push(...graph.filter(isObject));
        else if (isObject(item)) nodes.push(item);
      }
    } catch {
      // ignore invalid JSON-LD
    }
  });
  return nodes;
};

const typeOf = (node: unknown) => {
  const value = field(node, "@type");
  return (Array.isArray(value) ? value : [value]).map((item) =>
    String(item || "").toLowerCase()
  );
};

const offerOf = (node: unknown): unknown => {
  const offers = field(node, "offers");
  if (Array.isArray(offers)) return offers[0] || {};
  return offers || {};
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

const innerHtml = (node: Selection) => {
  if (!node || !node.length) return "";
  const clone = node.first().clone();
  clone.find("script, style, noscript, iframe").remove();
  return (clone.html() || clone.text() || "").trim();
};

const plainLength = (value: unknown) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;

const extractDescription = ($: CheerioAPI, productNode: JsonObject | undefined) => {
  const candidates = [
    text(field(productNode, "description")),
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

const isCategoryPage = ($: CheerioAPI) => {
  const bodyClass = $("body").attr("class") || "";
  const ogType = text($('meta[property="og:type"]').attr("content")).toLowerCase();
  if (/\bcatalog-category-view\b/.test(bodyClass)) return true;
  if (ogType === "product.group") return true;
  if (/\bpage-products\b/.test(bodyClass) && !/\bcatalog-product-view\b/.test(bodyClass)) {
    return true;
  }
  return false;
};

const isProductPage = ($: CheerioAPI) => {
  const bodyClass = $("body").attr("class") || "";
  const ogType = text($('meta[property="og:type"]').attr("content")).toLowerCase();
  if (/\bcatalog-product-view\b/.test(bodyClass)) return true;
  if (ogType === "product" || ogType === "product.item") return true;
  return (
    $("#product_addtocart_form").length > 0 &&
    $(".product-info-main").length > 0
  );
};

const scoped = ($: CheerioAPI) => {
  const root = $(".product-info-main, #product_addtocart_form").first();
  return root.length ? root : $("body");
};

const extractSku = ($: CheerioAPI, productNode: JsonObject | undefined) => {
  if (text(field(productNode, "sku"))) return text(field(productNode, "sku"));
  const $root = scoped($);
  return (
    text($root.find('[itemprop="sku"]').first().attr("content")) ||
    text($root.find('[itemprop="sku"]').first().text()) ||
    text($root.find(".product.attribute.sku .value").first().text()) ||
    text($root.find("[data-product-sku]").first().attr("data-product-sku"))
  );
};

const extractProduct = (html: string, pageUrl: string): ProductInput | null => {
  const $ = cheerio.load(html);
  if (isCategoryPage($) || !isProductPage($)) return null;

  const productNode = jsonLdNodes($).find((node) => {
    const types = typeOf(node);
    return types.includes("product") && !types.includes("itemlist");
  });
  const offer = offerOf(productNode);
  const $root = scoped($);
  const name =
    text(field(productNode, "name")) ||
    text($root.find("h1.page-title, h1.product-title, h1").first().text()) ||
    text($('meta[property="og:title"]').attr("content"));
  if (!name || isSearchResultName(name) || isSearchResultUrl(pageUrl)) {
    return null;
  }

  const sku = extractSku($, productNode);
  if (!sku) return null;

  const images: string[] = [];
  const image = field(productNode, "image");
  if (typeof image === "string") images.push(image);
  else if (Array.isArray(image)) {
    for (const item of image) {
      if (typeof item === "string") images.push(item);
      else if (fieldText(item, "url")) images.push(fieldText(item, "url"));
    }
  }
  const ogImage = text($('meta[property="og:image"]').attr("content"));
  if (ogImage && !images.includes(ogImage)) images.push(ogImage);

  return {
    sku,
    mpn: text(field(productNode, "mpn")),
    gtin: text(
      field(productNode, "gtin") ||
        field(productNode, "gtin13") ||
        field(productNode, "gtin12") ||
        $root.find('[itemprop="gtin13"], [itemprop="gtin"]').first().text()
    ),
    name,
    brand: text(field(field(productNode, "brand"), "name")) || text(field(productNode, "brand")),
    description: extractDescription($, productNode),
    price: toNumber(
      field(offer, "price") ||
        field(offer, "lowPrice") ||
        field(productNode, "price") ||
        $root.find('[itemprop="price"]').first().attr("content") ||
        $root
          .find(".product-info-price .price, .price-wrapper .price")
          .first()
          .text()
    ),
    currency:
      text(field(offer, "priceCurrency")) ||
      text($root.find('[itemprop="priceCurrency"]').first().attr("content")) ||
      "USD",
    images,
    category: text(field(productNode, "category")),
    availability: text(field(offer, "availability")).replace(/^.*\//, ""),
    status: "active",
    sourceUrl: pageUrl,
    attributes: {},
  };
};

const findProductLinks = (html: string, pageUrl: string, origin: string) => {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  for (const node of jsonLdNodes($)) {
    if (!typeOf(node).includes("itemlist")) continue;
    const elements = field(node, "itemListElement");
    for (const item of Array.isArray(elements) ? elements : []) {
      const href = field(item, "url") || field(field(item, "item"), "url");
      const absolute = toAbsolute(pageUrl, href);
      if (absolute && sameHost(origin, absolute) && !isSkippedUrl(absolute)) {
        links.add(absolute.split("#")[0]);
      }
    }
  }

  $("a.product-item-link, a.product-item-photo").each((_, el) => {
    const absolute = toAbsolute(pageUrl, $(el).attr("href"));
    if (absolute && sameHost(origin, absolute) && !isSkippedUrl(absolute)) {
      links.add(absolute.split("#")[0]);
    }
  });

  $("a[href]").each((_, el) => {
    const absolute = toAbsolute(pageUrl, $(el).attr("href"));
    if (!absolute || !sameHost(origin, absolute) || isSkippedUrl(absolute)) {
      return;
    }
    if (
      /\/(product|products|p|dp|catalog\/product)\b/i.test(absolute) ||
      /[?&](?:product_id|id_product)=/i.test(absolute)
    ) {
      links.add(absolute.split("#")[0]);
    }
  });

  return [...links];
};

const findListingLinks = (html: string, pageUrl: string, origin: string) => {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $(
    "a.action.next, a[rel='next'], link[rel='next'], .pages a, a.level-top, .navigation a, nav.navigation a, .categories a"
  ).each((_, el) => {
    const absolute = toAbsolute(pageUrl, $(el).attr("href"));
    if (
      absolute &&
      sameHost(origin, absolute) &&
      !isSkippedUrl(absolute) &&
      !$(el).is("a.product-item-link, a.product-item-photo")
    ) {
      links.add(absolute.split("#")[0]);
    }
  });
  return [...links];
};

const collectSitemapUrls = async (origin: string, allowed: RobotsCheck, signal?: AbortSignal) => {
  const seeds = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/media/sitemap/sitemap.xml`,
    `${origin}/pub/media/sitemap/sitemap.xml`,
  ];
  const queue = [...seeds];
  const seen = new Set<string>();
  const urls = new Set<string>();
  let sitemaps = 0;

  while (queue.length && sitemaps < MAX_SITEMAPS && urls.size < MAX_SITEMAP_URLS) {
    throwIfAborted(signal);
    const sitemapUrl = queue.shift();
    if (sitemapUrl === undefined) break;
    if (seen.has(sitemapUrl) || !allowed(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    sitemaps += 1;

    const { html } = await fetchPage(sitemapUrl, signal);
    if (!html) continue;

    const indexLocs = locTags(html).filter(
      (loc) => sameHost(origin, loc) && allowed(loc) && isSitemapUrl(loc)
    );
    if (indexLocs.length > 0 && /<sitemapindex/i.test(html)) {
      const productMaps = indexLocs.filter((loc) => /product/i.test(loc));
      for (const child of productMaps.length ? productMaps : indexLocs) {
        if (!seen.has(child)) queue.push(child);
      }
      await sleep(DELAY_MS, signal);
      continue;
    }

    const entries = sitemapUrlEntries(html).filter(
      (entry) =>
        entry.loc &&
        sameHost(origin, entry.loc) &&
        allowed(entry.loc) &&
        !isSitemapUrl(entry.loc) &&
        !isSkippedUrl(entry.loc)
    );
    const productEntries = entries.filter(isLikelyProductSitemapEntry);
    const chosen = productEntries.length ? productEntries : entries;

    for (const entry of chosen) {
      urls.add(entry.loc.split("#")[0]);
      if (urls.size >= MAX_SITEMAP_URLS) break;
    }

    await sleep(DELAY_MS, signal);
  }

  return [...urls];
};

const collectListingUrls = async (
  origin: string,
  startUrl: string,
  allowed: RobotsCheck,
  signal: AbortSignal | undefined,
  limit: number
) => {
  const queue = [startUrl, `${origin}/`];
  const seenListings = new Set<string>();
  const productUrls = new Set<string>();
  let pages = 0;

  while (queue.length && pages < limit) {
    throwIfAborted(signal);
    const pageUrl = queue.shift();
    if (pageUrl === undefined) break;
    const key = pageUrl.split("#")[0];
    if (seenListings.has(key) || !allowed(key) || isSkippedUrl(key)) continue;
    seenListings.add(key);
    pages += 1;

    const { html, finalUrl } = await fetchPage(pageUrl, signal);
    if (!html) {
      await sleep(DELAY_MS, signal);
      continue;
    }

    for (const link of findProductLinks(html, finalUrl, origin)) {
      if (allowed(link)) productUrls.add(link);
    }
    for (const link of findListingLinks(html, finalUrl, origin)) {
      if (!seenListings.has(link) && allowed(link) && !isSkippedUrl(link)) {
        queue.push(link);
      }
    }

    await sleep(DELAY_MS, signal);
  }

  return [...productUrls];
};

interface WebsiteFetchOptions {
  url?: string;
  signal?: AbortSignal;
  // Called every BATCH_SIZE products so they are saved while the crawl runs.
  onBatch?: (batch: ProductInput[], all: ProductInput[]) => Promise<unknown>;
}

const fetchWebsiteProducts = async ({
  url,
  signal,
  onBatch,
}: WebsiteFetchOptions = {}) => {
  const parsed = assertHttpUrl(url);
  await assertPublicUrl(parsed.toString());
  const origin = parsed.origin;
  const startUrl = parsed.toString();
  const allowed = await loadRobots(origin, signal);
  const products: ProductInput[] = [];
  const seenSku = new Set<string>();
  let batch: ProductInput[] = [];

  const flush = async (force = false) => {
    if (!onBatch || batch.length === 0) return;
    if (!force && batch.length < BATCH_SIZE) return;
    const chunk = batch;
    batch = [];
    await onBatch(chunk, products);
  };

  const addProduct = async (product: ProductInput) => {
    const key = normalize(product.sku);
    if (!key || seenSku.has(key)) return;
    seenSku.add(key);
    products.push(product);
    batch.push(product);
    await flush(false);
  };

  try {
    throwIfAborted(signal, products);
    const sitemapUrls = await collectSitemapUrls(origin, allowed, signal);
    const listingLimit =
      sitemapUrls.length >= 200 ? 15 : MAX_LISTING_PAGES;
    const listingUrls = await collectListingUrls(
      origin,
      startUrl,
      allowed,
      signal,
      listingLimit
    );

    const productUrls: string[] = [];
    const seenUrl = new Set<string>();
    for (const href of [...listingUrls, ...sitemapUrls]) {
      const key = href.split("#")[0];
      if (seenUrl.has(key) || isSkippedUrl(key) || !allowed(key)) continue;
      seenUrl.add(key);
      productUrls.push(key);
      if (productUrls.length >= MAX_PRODUCT_PAGES) break;
    }

    console.log(
      `[scrape] origin=${origin} sitemap=${sitemapUrls.length} listing=${listingUrls.length} fetch=${productUrls.length}`
    );

    for (const pageUrl of productUrls) {
      throwIfAborted(signal, products);
      const { html, finalUrl } = await fetchPage(pageUrl, signal);
      if (html) {
        const product = extractProduct(html, finalUrl);
        if (product) await addProduct(product);
      }
      await sleep(DELAY_MS, signal);
    }

    await flush(true);
  } catch (error) {
    if (error instanceof IngestAbortedError) {
      try {
        await flush(true);
      } catch {
        // keep abort path even if a late upsert fails
      }
      error.products = products;
    }
    throw error;
  }

  return products;
};

export { fetchWebsiteProducts };
