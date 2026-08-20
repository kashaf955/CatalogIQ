import axios from "axios";
import * as cheerio from "cheerio";

export interface ScrapedProduct {
  title?: string;
  price?: number;
}

/**
 * Placeholder scraper: fetches a competitor product page and returns raw HTML
 * loaded into cheerio. Selectors are site-specific and need to be filled in
 * per competitor once target sites are known.
 */
export async function fetchCompetitorPage(url: string): Promise<cheerio.CheerioAPI> {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (CatalogIQ price-check bot)" },
  });
  return cheerio.load(data);
}
