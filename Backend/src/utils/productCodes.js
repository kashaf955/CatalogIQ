const crypto = require("crypto");

const text = (value) => String(value || "").trim();

const normalize = (value) =>
  text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

// "PB-12345" / "PB12345" -> "12345" so store-prefixed SKUs line up with plain part numbers.
const stripStorePrefix = (value) => {
  const raw = text(value);
  if (!raw) return "";
  const dashed = raw.match(/^([A-Za-z]{1,6})[-_\s]+(.+)$/);
  if (dashed && text(dashed[2]).length >= 3) return text(dashed[2]);
  const glued = raw.match(/^([A-Za-z]{2,4})(\d[\w-]*)$/);
  if (glued && text(glued[2]).length >= 3) return text(glued[2]);
  return "";
};

// Prefix may differ (store code). Suffix must stay — 20307 and 20307-BK are different SKUs.
const corePartCode = (value) => normalize(stripStorePrefix(value) || value);

// A row with no SKU still needs a stable key for re-imports. It comes from what
// the row describes, not its position, so reordering a file changes nothing.
const generatedSku = ({ name, brand, mpn, gtin }) =>
  `gen-${crypto
    .createHash("sha256")
    .update([name, brand, mpn, gtin].map(normalize).join("|"))
    .digest("hex")
    .slice(0, 16)}`;

// xls-N and api-N are the row-number keys used by earlier imports.
const isGeneratedSku = (value) =>
  /^(gen-[0-9a-f]{16}|xls-\d+|api-\d+)$/i.test(text(value));

// Generated keys identify nothing outside their own source, so they never match.
const realSku = (product) =>
  isGeneratedSku(product?.sku) ? "" : text(product?.sku);

const partIdentity = (product) =>
  corePartCode(realSku(product)) || corePartCode(product?.mpn);

// Same sellable part only when identities are exact after prefix strip.
const samePartIdentity = (a, b) => {
  const left = partIdentity(a);
  const right = partIdentity(b);
  return Boolean(left && right && left === right);
};

module.exports = {
  text,
  normalize,
  stripStorePrefix,
  corePartCode,
  generatedSku,
  isGeneratedSku,
  realSku,
  partIdentity,
  samePartIdentity,
};
