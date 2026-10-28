const { normalize } = require("./productCodes");

const isSearchResultUrl = (url) => {
  const value = String(url || "");
  return (
    /\/catalogsearch\//i.test(value) ||
    /\/search\.php/i.test(value) ||
    /\/search(?:\/|\?|$)/i.test(value)
  );
};

const isSearchResultName = (name) =>
  /^search results\b/i.test(String(name || "").trim());

const isUnavailableProduct = (product) => {
  const value = normalize(
    `${product?.availability || ""} ${product?.status || ""}`
  );
  return /outofstock|soldout|discontinued|unavailable|notavailable|offline/.test(
    value
  );
};

const isMatchableProduct = (product) => {
  if (!product) return false;
  if (isSearchResultName(product.name)) return false;
  if (isSearchResultUrl(product.sourceUrl)) return false;
  if (isUnavailableProduct(product)) return false;
  return true;
};

module.exports = {
  isSearchResultUrl,
  isSearchResultName,
  isUnavailableProduct,
  isMatchableProduct,
};
