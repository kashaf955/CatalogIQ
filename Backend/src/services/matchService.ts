import CatalogSource from "../models/catalogSourceModel";
import Product, { type ProductRecord } from "../models/productModel";
import type { Types } from "mongoose";
import type { CatalogType, Id, MatchAgainst } from "../types/domain";
import Match from "../models/matchModel";
import {
  normalize,
  corePartCode,
  realSku,
  samePartIdentity,
} from "../utils/productCodes";
import { isMatchableProduct } from "../utils/productMatchability";
import { HttpError } from "../utils/httpError";

const MIN_CODE_LENGTH = 3;
const MAX_CANDIDATES = 3;
const PRODUCT_FIELDS =
  "_id sourceId sku mpn gtin brand name sourceUrl availability status";

const codes = (...values: unknown[]) => [
  ...new Set(values.map(normalize).filter((code) => code.length >= MIN_CODE_LENGTH)),
];

interface MatchRule {
  reason: string;
  score: number;
  keys: (product: ProductRecord) => string[];
  // Skip candidates whose brand differs from ours.
  checkBrand?: boolean;
  // Require the same part after stripping store prefixes (not just the same MPN).
  requireSamePart?: boolean;
}

export interface FoundMatch {
  ourProductId: Types.ObjectId;
  theirProductId: Types.ObjectId;
  theirSourceId: Types.ObjectId;
  score: number;
  reason: string;
}

// Checked in order; for each source, the first rule that finds candidates wins.
const RULES: MatchRule[] = [
  {
    reason: "GTIN",
    score: 100,
    keys: (p) => codes(p.gtin).map((code) => code.replace(/^0+/, "")),
  },
  {
    reason: "MPN",
    score: 95,
    keys: (p) => codes(p.mpn),
    checkBrand: true,
    // Same MPN with a SKU suffix (20307 vs 20307-BK) is a different sellable SKU.
    requireSamePart: true,
  },
  { reason: "SKU", score: 90, keys: (p) => codes(realSku(p)) },
  {
    reason: "Part number",
    score: 80,
    // SKU wins when present so a suffixed SKU is not keyed as the bare MPN.
    keys: (p) => codes(corePartCode(realSku(p)) || corePartCode(p.mpn)),
    checkBrand: true,
    requireSamePart: true,
  },
];

// Same MPN under two different brands is usually two different parts.
const brandsConflict = (a: ProductRecord, b: ProductRecord) => {
  const left = normalize(a.brand);
  const right = normalize(b.brand);
  return Boolean(left && right && left !== right);
};

const indexBy = (products: ProductRecord[], keysOf: MatchRule["keys"]) => {
  const index = new Map<string, ProductRecord[]>();
  for (const product of products) {
    for (const key of keysOf(product)) {
      const list = index.get(key) ?? [];
      list.push(product);
      index.set(key, list);
    }
  }
  return index;
};

const findMatches = (ours: ProductRecord[], theirs: ProductRecord[]): FoundMatch[] => {
  const indexes = RULES.map((rule) => indexBy(theirs, rule.keys));
  const results: FoundMatch[] = [];

  for (const product of ours) {
    // Each competitor or manufacturer is its own decision: the same part sold by
    // two competitors is two good matches, not two rival candidates.
    const settledSources = new Set<string>();
    for (let i = 0; i < RULES.length; i += 1) {
      const rule = RULES[i];
      const foundBySource = new Map<string, Map<string, ProductRecord>>();
      for (const key of rule.keys(product)) {
        for (const candidate of indexes[i].get(key) || []) {
          const source = String(candidate.sourceId);
          if (settledSources.has(source)) continue;
          if (rule.checkBrand && brandsConflict(product, candidate)) continue;
          if (rule.requireSamePart && !samePartIdentity(product, candidate)) {
            continue;
          }
          const found = foundBySource.get(source) ?? new Map<string, ProductRecord>();
          found.set(String(candidate._id), candidate);
          foundBySource.set(source, found);
        }
      }

      for (const [source, found] of foundBySource) {
        settledSources.add(source);
        for (const candidate of [...found.values()].slice(0, MAX_CANDIDATES)) {
          results.push({
            ourProductId: product._id,
            theirProductId: candidate._id,
            theirSourceId: candidate.sourceId,
            score: rule.score,
            reason: rule.reason,
          });
        }
      }
    }
  }

  return results;
};

const productsOfType = async (tenantId: Id, type: CatalogType) => {
  const sources = await CatalogSource.find({
    tenantId,
    type,
    isDeleted: false,
  }).select("_id");
  return Product.find({
    tenantId,
    sourceId: { $in: sources.map((source) => source._id) },
    isDeleted: false,
  })
    .select(PRODUCT_FIELDS)
    .lean();
};

// Only a single candidate from a source qualifies; two candidates from the same
// source still need a person to pick one.
const autoAcceptable = (found: FoundMatch[], threshold: number | null | undefined) => {
  if (typeof threshold !== "number") return [];
  const candidates = new Map<string, FoundMatch[]>();
  for (const match of found) {
    const key = `${match.ourProductId}|${match.theirSourceId}`;
    candidates.set(key, [...(candidates.get(key) || []), match]);
  }
  return [...candidates.values()]
    .filter((list) => list.length === 1 && list[0].score >= threshold)
    .map((list) => list[0]);
};

const runMatching = async (
  tenantId: Id,
  against: MatchAgainst,
  autoAcceptScore: number | null = null
) => {
  const [ours, theirsAll] = await Promise.all([
    productsOfType(tenantId, "our_catalog"),
    productsOfType(tenantId, against),
  ]);
  const skippedIds = theirsAll
    .filter((product) => !isMatchableProduct(product))
    .map((product) => product._id);
  const theirs = theirsAll.filter(isMatchableProduct);

  if (skippedIds.length > 0) {
    await Match.deleteMany({
      tenantId,
      against,
      theirProductId: { $in: skippedIds },
    });
  }

  if (ours.length === 0 || theirsAll.length === 0) {
    const error = new HttpError(`Ingest your catalog and at least one ${against} source before matching`, 400);
    throw error;
  }

  if (theirs.length === 0) {
    return {
      ourProducts: ours.length,
      theirProducts: 0,
      matched: 0,
      matches: 0,
      autoAccepted: 0,
      removed: skippedIds.length,
    };
  }

  const found = findMatches(ours, theirs);
  const runAt = new Date();

  if (found.length > 0) {
    await Match.bulkWrite(
      found.map((match) => ({
        updateOne: {
          filter: {
            tenantId,
            ourProductId: match.ourProductId,
            theirProductId: match.theirProductId,
          },
          update: {
            $set: { ...match, against, lastRunAt: runAt },
            $setOnInsert: { status: "pending" },
          },
          upsert: true,
        },
      }))
    );
  }

  // Reviewed matches (accepted, rejected, ignored) are never overridden.
  const autoMatches = autoAcceptable(found, autoAcceptScore);
  const auto =
    autoMatches.length > 0
      ? await Match.bulkWrite(
          autoMatches.map((match) => ({
            updateOne: {
              filter: {
                tenantId,
                against,
                status: "pending",
                lastRunAt: runAt,
                ourProductId: match.ourProductId,
                theirProductId: match.theirProductId,
              },
              update: { $set: { status: "accepted", autoAccepted: true } },
            },
          }))
        )
      : { modifiedCount: 0 };

  // Pending matches that no longer show up are stale; reviewed ones are kept.
  // AI suggestions are not produced by the rules, so a rules run keeps them.
  const stale = await Match.deleteMany({
    tenantId,
    against,
    status: "pending",
    reason: { $ne: "AI" },
    lastRunAt: { $ne: runAt },
  });

  return {
    ourProducts: ours.length,
    theirProducts: theirs.length,
    matched: new Set(found.map((match) => String(match.ourProductId))).size,
    matches: found.length,
    autoAccepted: auto.modifiedCount,
    removed: stale.deletedCount,
  };
};

export { runMatching, findMatches, autoAcceptable };
