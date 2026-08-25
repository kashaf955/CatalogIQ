import { chromium } from "playwright";
import { CompetitorSiteDocument } from "../models/CompetitorSite";
import {
  CompetitorProduct,
  CompetitorDiscoveryMethod,
  CompetitorProductDocument,
} from "../models/CompetitorProduct";

export interface DiscoveryQuery {
  mpn?: string;
  gtin?: string;
  sku?: string;
  brand?: string;
  name?: string;
}

const DISCOVERY_ORDER: { method: CompetitorDiscoveryMethod; buildQuery: (q: DiscoveryQuery) => string | undefined }[] = [
  { method: "exact_mpn", buildQuery: (q) => q.mpn },
  { method: "exact_gtin", buildQuery: (q) => q.gtin },
  { method: "sku", buildQuery: (q) => q.sku },
  { method: "brand_mpn", buildQuery: (q) => (q.brand && q.mpn ? `${q.brand} ${q.mpn}` : undefined) },
  { method: "brand_name", buildQuery: (q) => (q.brand && q.name ? `${q.brand} ${q.name}` : undefined) },
  { method: "name_specs", buildQuery: (q) => q.name },
];

/**
 * Runs the discovery priority order from spec section 13 against a
 * competitor site configured with a search URL template + CSS selectors
 * (spec section 14). Stops at the first method that finds a strong
 * candidate rather than crawling the whole site.
 */
export async function discoverCompetitorProduct(
  site: CompetitorSiteDocument,
  query: DiscoveryQuery
): Promise<CompetitorProductDocument | undefined> {
  if (!site.selectors.searchUrlTemplate || !site.selectors.resultLinkSelector) {
    throw new Error(
      `Competitor "${site.name}" is missing search configuration (searchUrlTemplate / resultLinkSelector).`
    );
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const step of DISCOVERY_ORDER) {
      const query_ = step.buildQuery(query);
      if (!query_) continue;

      const page = await browser.newPage({
        userAgent: "Mozilla/5.0 (compatible; CatalogIQ/1.0; +product-research-bot)",
      });
      try {
        const searchUrl = site.selectors.searchUrlTemplate.replace(
          "{query}",
          encodeURIComponent(query_)
        );
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

        const resultHref = await page
          .locator(site.selectors.resultLinkSelector)
          .first()
          .getAttribute("href")
          .catch(() => null);
        if (!resultHref) continue;

        const productUrl = new URL(resultHref, site.baseUrl).toString();
        await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

        const extracted = await extractProductFields(page, site);
        if (!extracted.name) continue;

        return CompetitorProduct.create({
          competitorSite: site._id,
          url: productUrl,
          discoveryMethod: step.method,
          lastCheckedAt: new Date(),
          ...extracted,
        });
      } finally {
        await page.close();
      }
    }
    return undefined;
  } finally {
    await browser.close();
  }
}

async function extractProductFields(
  page: import("playwright").Page,
  site: CompetitorSiteDocument
) {
  const { selectors } = site;
  const textOf = async (selector?: string) => {
    if (!selector) return undefined;
    return (await page.locator(selector).first().innerText().catch(() => undefined))?.trim();
  };

  const name = await textOf(selectors.name);
  const priceText = await textOf(selectors.price);
  const price = priceText ? Number(priceText.replace(/[^0-9.]/g, "")) : undefined;

  return {
    name,
    sku: await textOf(selectors.sku),
    brand: await textOf(selectors.brand),
    description: await textOf(selectors.description),
    availability: await textOf(selectors.availability),
    price: Number.isFinite(price) ? price : undefined,
    images: selectors.images
      ? await page.locator(selectors.images).evaluateAll((els) =>
          els.map((el) => el.getAttribute("src")).filter((v): v is string => Boolean(v))
        )
      : [],
  };
}
