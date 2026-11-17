import { normalize } from "./productCodes";

export interface MatchableFields {
  name?: string | null;
  sourceUrl?: string | null;
  availability?: string | null;
  status?: string | null;
}

const isSearchResultUrl = (url?: string | null) => {
  const value = String(url || "");
  return (
    /\/catalogsearch\//i.test(value) ||
    /\/search\.php/i.test(value) ||
    /\/search(?:\/|\?|$)/i.test(value)
  );
};

const isSearchResultName = (name?: string | null) =>
  /^search results\b/i.test(String(name || "").trim());

const isUnavailableProduct = (product: MatchableFields | null | undefined) => {
  const value = normalize(
    `${product?.availability || ""} ${product?.status || ""}`
  );
  return /outofstock|soldout|discontinued|unavailable|notavailable|offline/.test(
    value
  );
};

const isMatchableProduct = (product: MatchableFields | null | undefined) => {
  if (!product) return false;
  if (isSearchResultName(product.name)) return false;
  if (isSearchResultUrl(product.sourceUrl)) return false;
  if (isUnavailableProduct(product)) return false;
  return true;
};

export {
  isSearchResultUrl,
  isSearchResultName,
  isUnavailableProduct,
  isMatchableProduct,
};
