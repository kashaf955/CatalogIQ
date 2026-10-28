const cheerio = require("cheerio");
const { text, normalize } = require("../utils/productCodes");
const {
  throwIfAborted,
  createAbortedError,
} = require("../utils/ingestJobs");
const {
  isSearchResultUrl,
  isSearchResultName,
} = require("../utils/productMatchability");

const DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 15000;
const MAX_SITEMAPS = 20;
const MAX_SITEMAP_URLS = 8000;
const MAX_LISTING_PAGES = 60;
const MAX_PRODUCT_PAGES = 1500;
const BATCH_SIZE = 25;

const SKIP_PATH =
  /\/(checkout|cart|customer|account|wishlist|catalogsearch|search|contact|blog|privacy|login|register|admin|rest\/|graphql)(\/|\?|$)/i;

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

const pathOf = (url) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
};

const fetchPage = async (url, signal) => {
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
    if (error?.code === "INGEST_ABORTED") throw error;
    return { html: "", finalUrl: url };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};

const locTags = (xml) =>
  [...String(xml).matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) =>
    text(match[1])
  );

const parseRobots = (body) => {
  const lines = String(body || "").split(/\r?\n/);
  let applies = false;
  const disallows = [];
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
  return (url) => {
    const path = pathOf(url);
    return !disallows.some(
      (rule) => rule !== "" && (rule === "/" || path.startsWith(rule))
    );
  };
};

const loadRobots = async (origin, signal) => {
  const { html } = await fetchPage(`${origin}/robots.txt`, signal);
  if (!html) return () => true;
  return parseRobots(html);
};

const isSkippedUrl = (url) =>
  !url ||
  isSearchResultUrl(url) ||
  SKIP_PATH.test(pathOf(url)) ||
  /^(mailto:|tel:|javascript:)/i.test(url);

const isSitemapUrl = (url) => /\.xml($|\?)/i.test(url) || /sitemap/i.test(url);

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

const extractSku = ($, productNode) =>
  text(productNode?.sku) ||
  text($('[itemprop="sku"]').first().attr("content")) ||
  text($('[itemprop="sku"]').first().text()) ||
  text($(".product.attribute.sku .value").first().text()) ||
  text($("[data-product-sku]").first().attr("data-product-sku"));

const extractProduct = (html, pageUrl) => {
  const $ = cheerio.load(html);
  const productNode = jsonLdNodes($).find((node) =>
    typeOf(node).includes("product")
  );
  const offer = offerOf(productNode);
  const name =
    text(productNode?.name) ||
    text($('meta[property="og:title"]').attr("content")) ||
    text($("h1.page-title, h1.product-title, h1").first().text());
  if (!name || isSearchResultName(name) || isSearchResultUrl(pageUrl)) {
    return null;
  }

  const sku = extractSku($, productNode);
  if (!sku) return null;

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
    mpn: text(productNode?.mpn),
    gtin: text(
      productNode?.gtin ||
        productNode?.gtin13 ||
        productNode?.gtin12 ||
        $('[itemprop="gtin13"], [itemprop="gtin"]').first().text()
    ),
    name,
    brand: text(productNode?.brand?.name) || text(productNode?.brand),
    description: extractDescription($, productNode),
    price: toNumber(
      offer.price ||
        offer.lowPrice ||
        productNode?.price ||
        $('[itemprop="price"]').first().attr("content") ||
        $(".price-wrapper .price, .product-info-price .price").first().text()
    ),
    currency:
      text(offer.priceCurrency) ||
      text($('[itemprop="priceCurrency"]').first().attr("content")) ||
      "USD",
    images,
    category: text(productNode?.category),
    availability: text(offer.availability).replace(/^.*\//, ""),
    status: "active",
    sourceUrl: pageUrl,
    attributes: {},
  };
};

const findProductLinks = (html, pageUrl, origin) => {
  const $ = cheerio.load(html);
  const links = new Set();

  for (const node of jsonLdNodes($)) {
    if (!typeOf(node).includes("itemlist")) continue;
    for (const item of node.itemListElement || []) {
      const href = item?.url || item?.item?.url;
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

const findListingLinks = (html, pageUrl, origin) => {
  const $ = cheerio.load(html);
  const links = new Set();
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

const collectSitemapUrls = async (origin, allowed, signal) => {
  const seeds = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/media/sitemap/sitemap.xml`,
    `${origin}/pub/media/sitemap/sitemap.xml`,
  ];
  const queue = [...seeds];
  const seen = new Set();
  const urls = new Set();
  let sitemaps = 0;

  while (queue.length && sitemaps < MAX_SITEMAPS && urls.size < MAX_SITEMAP_URLS) {
    throwIfAborted(signal);
    const sitemapUrl = queue.shift();
    if (seen.has(sitemapUrl) || !allowed(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    sitemaps += 1;

    const { html } = await fetchPage(sitemapUrl, signal);
    if (!html) continue;

    const locs = locTags(html).filter(
      (loc) => sameHost(origin, loc) && allowed(loc)
    );
    const childSitemaps = locs.filter(isSitemapUrl);
    const pageUrls = locs.filter((loc) => !isSitemapUrl(loc) && !isSkippedUrl(loc));

    if (childSitemaps.length > 0) {
      const productMaps = childSitemaps.filter((loc) =>
        /product/i.test(loc)
      );
      for (const child of productMaps.length ? productMaps : childSitemaps) {
        if (!seen.has(child)) queue.push(child);
      }
    }

    for (const loc of pageUrls) {
      urls.add(loc.split("#")[0]);
      if (urls.size >= MAX_SITEMAP_URLS) break;
    }

    await sleep(DELAY_MS, signal);
  }

  return [...urls];
};

const collectListingUrls = async (origin, startUrl, allowed, signal, limit) => {
  const queue = [startUrl, `${origin}/`];
  const seenListings = new Set();
  const productUrls = new Set();
  let pages = 0;

  while (queue.length && pages < limit) {
    throwIfAborted(signal);
    const pageUrl = queue.shift();
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

const fetchWebsiteProducts = async ({
  url,
  signal,
  onBatch,
} = {}) => {
  const parsed = assertHttpUrl(url);
  const origin = parsed.origin;
  const startUrl = parsed.toString();
  const allowed = await loadRobots(origin, signal);
  const products = [];
  const seenSku = new Set();
  let batch = [];

  const flush = async (force = false) => {
    if (!onBatch || batch.length === 0) return;
    if (!force && batch.length < BATCH_SIZE) return;
    const chunk = batch;
    batch = [];
    await onBatch(chunk, products);
  };

  const addProduct = async (product) => {
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

    const productUrls = [];
    const seenUrl = new Set();
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
    if (error?.code === "INGEST_ABORTED") {
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

module.exports = { fetchWebsiteProducts };
