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

module.exports = { text, normalize, stripStorePrefix };
