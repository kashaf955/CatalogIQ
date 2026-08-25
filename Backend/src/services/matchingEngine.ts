import stringSimilarity from "string-similarity";
import { Types } from "mongoose";
import { OurProduct, OurProductDocument } from "../models/OurProduct";
import { ManufacturerProduct } from "../models/ManufacturerProduct";
import { MatchResult } from "../models/MatchResult";
import { resolvePairStatus } from "./manufacturerStatusService";
import { verifyAmbiguousMatch } from "./claudeVerificationService";

const FUZZY_MATCH_THRESHOLD = 0.6; // above this: accept as identity match
const FUZZY_REVIEW_THRESHOLD = 0.35; // between this and the match threshold: send for review

export interface IdentityMatch {
  ourProduct: OurProductDocument;
  confidence: number;
  signal: string;
}

/**
 * Finds the best candidate in `candidates` for `mfgProduct`, following the
 * signal priority from spec section 16 (MPN/GTIN highest, name similarity
 * lowest, price never used as identity evidence).
 */
export function findBestMatch(
  mfgProduct: { mpn: string; sku?: string; gtin?: string; brand: string; name: string },
  candidates: OurProductDocument[]
): IdentityMatch | undefined {
  const normalizedMpn = normalize(mfgProduct.mpn);
  const normalizedGtin = mfgProduct.gtin ? normalize(mfgProduct.gtin) : undefined;
  const normalizedSku = mfgProduct.sku ? normalize(mfgProduct.sku) : undefined;

  for (const candidate of candidates) {
    if (candidate.mpn && normalize(candidate.mpn) === normalizedMpn) {
      return { ourProduct: candidate, confidence: 1, signal: "exact_mpn" };
    }
  }

  if (normalizedGtin) {
    for (const candidate of candidates) {
      if (candidate.gtin && normalize(candidate.gtin) === normalizedGtin) {
        return { ourProduct: candidate, confidence: 0.98, signal: "exact_gtin" };
      }
    }
  }

  if (normalizedSku) {
    for (const candidate of candidates) {
      if (candidate.sku && normalize(candidate.sku) === normalizedSku) {
        return { ourProduct: candidate, confidence: 0.95, signal: "sku" };
      }
    }
  }

  const sameBrand = candidates.filter(
    (c) => c.brand && normalize(c.brand) === normalize(mfgProduct.brand)
  );

  let best: IdentityMatch | undefined;
  for (const candidate of sameBrand) {
    const similarity = stringSimilarity.compareTwoStrings(
      normalize(candidate.name),
      normalize(mfgProduct.name)
    );
    if (!best || similarity > best.confidence) {
      best = { ourProduct: candidate, confidence: similarity, signal: "brand_name" };
    }
  }

  if (best && best.confidence >= FUZZY_REVIEW_THRESHOLD) {
    return best;
  }
  return undefined;
}

export interface ComparisonRunResult {
  manufacturerProductsProcessed: number;
  ourProductsWithoutManufacturerMatch: number;
  matchResultsWritten: number;
}

/**
 * Core of the manufacturer side-by-side workspace (spec sections 7-9):
 * compares only the selected manufacturer + brand(s) against our catalog
 * restricted to the same brand(s), rather than the full combined catalog.
 */
export async function runManufacturerComparison(
  manufacturerId: string,
  brands: string[]
): Promise<ComparisonRunResult> {
  const manufacturerObjectId = new Types.ObjectId(manufacturerId);

  const [mfgProducts, ourProducts] = await Promise.all([
    ManufacturerProduct.find({ manufacturer: manufacturerObjectId, brand: { $in: brands } }),
    OurProduct.find({ brand: { $in: brands } }),
  ]);

  const matchedOurProductIds = new Set<string>();
  let written = 0;

  for (const mfgProduct of mfgProducts) {
    const candidates = ourProducts.filter(
      (p) => normalize(p.brand ?? "") === normalize(mfgProduct.brand)
    );
    const match = findBestMatch(
      {
        mpn: mfgProduct.mpn,
        sku: mfgProduct.sku,
        gtin: mfgProduct.gtin,
        brand: mfgProduct.brand,
        name: mfgProduct.name,
      },
      candidates
    );

    if (match) matchedOurProductIds.add(match.ourProduct.id);

    const isAmbiguous =
      match !== undefined &&
      match.signal === "brand_name" &&
      match.confidence < FUZZY_MATCH_THRESHOLD;

    const { status, note } = resolvePairStatus(mfgProduct, match?.ourProduct);
    const finalStatus = isAmbiguous ? "needs_review" : status;

    const resultDoc = await MatchResult.findOneAndUpdate(
      { manufacturerProduct: mfgProduct._id },
      {
        manufacturerProduct: mfgProduct._id,
        ourProduct: match?.ourProduct._id,
        manufacturer: manufacturerObjectId,
        brand: mfgProduct.brand,
        matchStatus: finalStatus,
        confidence: match?.confidence ?? 0,
        decisionSource: "rule",
        matchedSignal: match?.signal,
        notes: note,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    written += 1;

    if (isAmbiguous && resultDoc) {
      await verifyAmbiguousMatch(resultDoc._id.toString());
    }
  }

  const unmatchedOurProducts = ourProducts.filter(
    (p) => !matchedOurProductIds.has(p.id)
  );

  for (const ourProduct of unmatchedOurProducts) {
    await MatchResult.findOneAndUpdate(
      { ourProduct: ourProduct._id, manufacturer: manufacturerObjectId, manufacturerProduct: null },
      {
        ourProduct: ourProduct._id,
        manufacturer: manufacturerObjectId,
        brand: ourProduct.brand,
        matchStatus: "no_match",
        confidence: 0,
        decisionSource: "rule",
        notes: "Not found in manufacturer file",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    written += 1;
  }

  return {
    manufacturerProductsProcessed: mfgProducts.length,
    ourProductsWithoutManufacturerMatch: unmatchedOurProducts.length,
    matchResultsWritten: written,
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
