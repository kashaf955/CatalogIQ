const CatalogSource = require("../models/catalogSourceModel");
const Product = require("../models/productModel");
const Match = require("../models/matchModel");
const { normalize, stripStorePrefix } = require("../utils/productCodes");

const MIN_CODE_LENGTH = 3;
const MAX_CANDIDATES = 3;
const PRODUCT_FIELDS = "_id sourceId sku mpn gtin brand";

const codes = (...values) => [
  ...new Set(values.map(normalize).filter((code) => code.length >= MIN_CODE_LENGTH)),
];

// Checked in order; the first rule that finds candidates wins for that product.
const RULES = [
  {
    reason: "GTIN",
    score: 100,
    keys: (p) => codes(p.gtin).map((code) => code.replace(/^0+/, "")),
  },
  { reason: "MPN", score: 95, keys: (p) => codes(p.mpn), checkBrand: true },
  { reason: "SKU", score: 90, keys: (p) => codes(p.sku) },
  {
    reason: "Part number",
    score: 80,
    keys: (p) =>
      codes(p.sku, p.mpn, stripStorePrefix(p.sku), stripStorePrefix(p.mpn)),
    checkBrand: true,
  },
];

// Same MPN under two different brands is usually two different parts.
const brandsConflict = (a, b) => {
  const left = normalize(a.brand);
  const right = normalize(b.brand);
  return Boolean(left && right && left !== right);
};

const indexBy = (products, keysOf) => {
  const index = new Map();
  for (const product of products) {
    for (const key of keysOf(product)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(product);
    }
  }
  return index;
};

const findMatches = (ours, theirs) => {
  const indexes = RULES.map((rule) => indexBy(theirs, rule.keys));
  const results = [];

  for (const product of ours) {
    for (let i = 0; i < RULES.length; i += 1) {
      const rule = RULES[i];
      const found = new Map();
      for (const key of rule.keys(product)) {
        for (const candidate of indexes[i].get(key) || []) {
          if (rule.checkBrand && brandsConflict(product, candidate)) continue;
          found.set(String(candidate._id), candidate);
        }
      }
      if (found.size === 0) continue;

      for (const candidate of [...found.values()].slice(0, MAX_CANDIDATES)) {
        results.push({
          ourProductId: product._id,
          theirProductId: candidate._id,
          theirSourceId: candidate.sourceId,
          score: rule.score,
          reason: rule.reason,
        });
      }
      break;
    }
  }

  return results;
};

const productsOfType = async (tenantId, type) => {
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

// Only products with a single candidate qualify; two equally good candidates
// still need a person to pick one.
const autoAcceptable = (found, threshold) => {
  if (typeof threshold !== "number") return [];
  const candidates = new Map();
  for (const match of found) {
    const key = String(match.ourProductId);
    candidates.set(key, [...(candidates.get(key) || []), match]);
  }
  return [...candidates.values()]
    .filter((list) => list.length === 1 && list[0].score >= threshold)
    .map((list) => list[0].ourProductId);
};

const runMatching = async (tenantId, against, autoAcceptScore = null) => {
  const [ours, theirs] = await Promise.all([
    productsOfType(tenantId, "our_catalog"),
    productsOfType(tenantId, against),
  ]);

  if (ours.length === 0 || theirs.length === 0) {
    const error = new Error(
      `Ingest your catalog and at least one ${against} source before matching`
    );
    error.status = 400;
    throw error;
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
  const autoIds = autoAcceptable(found, autoAcceptScore);
  const auto =
    autoIds.length > 0
      ? await Match.updateMany(
          {
            tenantId,
            against,
            status: "pending",
            lastRunAt: runAt,
            ourProductId: { $in: autoIds },
          },
          { status: "accepted", autoAccepted: true }
        )
      : { modifiedCount: 0 };

  // Pending matches that no longer show up are stale; reviewed ones are kept.
  const stale = await Match.deleteMany({
    tenantId,
    against,
    status: "pending",
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

module.exports = { runMatching, findMatches };
