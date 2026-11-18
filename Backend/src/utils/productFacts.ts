import crypto from "crypto";

// The product fields an AI description is written from.
export interface FactFields {
  name?: string | null;
  brand?: string | null;
  mpn?: string | null;
  category?: string | null;
  fitment?: string | null;
  description?: string | null;
  attributes?: unknown;
}

// Fingerprint of a product's own facts. When a re-import changes them, a
// stored AI description no longer matches and is left out of exports.
export const productFactsHash = (product: FactFields) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        product.name ?? "",
        product.brand ?? "",
        product.mpn ?? "",
        product.category ?? "",
        product.fitment ?? "",
        product.description ?? "",
        product.attributes ?? {},
      ])
    )
    .digest("hex");

// The stored AI description when it still matches the product, else "".
export const currentAiDescription = (
  product: FactFields & { aiDescription?: { html?: string | null; factsHash?: string | null } | null }
) => {
  const ai = product.aiDescription;
  if (!ai?.html || ai.factsHash !== productFactsHash(product)) return "";
  return ai.html;
};
