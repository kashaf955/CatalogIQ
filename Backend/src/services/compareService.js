const Match = require("../models/matchModel");
const Product = require("../models/productModel");
const { isMatchableProduct } = require("../utils/productMatchability");

const PRODUCT_FIELDS =
  "sku mpn gtin name brand description price images fitment category availability sourceUrl";

const pickText = (ours, theirs) => {
  const left = String(ours || "").trim();
  if (left) return left;
  return String(theirs || "").trim();
};

const pickList = (ours, theirs) => {
  if (Array.isArray(ours) && ours.length) return ours;
  if (Array.isArray(theirs) && theirs.length) return theirs;
  return [];
};

// Share of the current price; bigger cuts are flagged before anyone applies them.
const LARGE_DROP = 0.3;

// Store descriptions are often HTML; the Compare table shows the words.
const plainDescription = (value) =>
  String(value || "")
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

const parsePercent = (value) => {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0 || percent > 90) {
    const error = new Error("Enter a percent between 0 and 90");
    error.status = 400;
    throw error;
  }
  return percent;
};

const targetPrice = (theirPrice, percent) => {
  if (
    typeof theirPrice !== "number" ||
    !Number.isFinite(theirPrice) ||
    theirPrice <= 0
  ) {
    return null;
  }
  const price = roundMoney(theirPrice * (1 - percent / 100));
  return price > 0 ? price : null;
};

const toCombined = (match) => {
  const ours = match.ourProductId;
  const theirs = match.theirProductId;
  const ourPrice = typeof ours.price === "number" ? ours.price : null;
  const theirPrice = typeof theirs.price === "number" ? theirs.price : null;
  const gap =
    ourPrice != null && theirPrice != null
      ? roundMoney(ourPrice - theirPrice)
      : null;

  return {
    id: String(match._id),
    ourProductId: String(ours._id),
    theirProductId: String(theirs._id),
    theirSourceId: String(match.theirSourceId || theirs._id),
    sku: ours.sku || "",
    theirSku: theirs.sku || "",
    name: pickText(ours.name, theirs.name),
    brand: pickText(ours.brand, theirs.brand),
    mpn: pickText(ours.mpn, theirs.mpn),
    gtin: pickText(ours.gtin, theirs.gtin),
    ourDescription: plainDescription(ours.description),
    theirDescription: plainDescription(theirs.description),
    images: pickList(ours.images, theirs.images),
    fitment: pickText(ours.fitment, theirs.fitment),
    category: pickText(ours.category, theirs.category),
    ourPrice,
    theirPrice,
    gap,
    ourAvailability: String(ours.availability || "").trim(),
    theirAvailability: String(theirs.availability || "").trim(),
    theirUrl: theirs.sourceUrl || "",
    score: match.score,
    reason: match.reason,
  };
};

const loadAccepted = async (tenantId, against) => {
  const matches = await Match.find({
    tenantId,
    against,
    status: "accepted",
  })
    .sort({ score: -1, createdAt: -1 })
    .limit(5000)
    .populate({
      path: "ourProductId",
      select: PRODUCT_FIELDS,
      match: { isDeleted: false },
    })
    .populate({
      path: "theirProductId",
      select: PRODUCT_FIELDS,
      match: { isDeleted: false },
    })
    .lean();

  return matches
    .filter(
      (match) =>
        match.ourProductId &&
        match.theirProductId &&
        isMatchableProduct(match.theirProductId)
    )
    .map(toCombined);
};

const pricePlan = (rows, percent) => {
  const byProduct = new Map();
  for (const row of rows) {
    const list = byProduct.get(row.ourProductId) || [];
    list.push(row);
    byProduct.set(row.ourProductId, list);
  }

  const updates = [];
  const skipped = [];
  for (const [, list] of byProduct) {
    const row = list[0];
    const sources = new Set(list.map((item) => item.theirSourceId));
    if (sources.size < list.length) {
      skipped.push({
        sku: row.sku,
        reason: "several accepted matches from one competitor",
      });
      continue;
    }

    // Undercut the cheapest competitor that has a usable price.
    let theirPrice = null;
    let nextPrice = null;
    for (const item of list) {
      const target = targetPrice(item.theirPrice, percent);
      if (target != null && (nextPrice == null || target < nextPrice)) {
        nextPrice = target;
        theirPrice = item.theirPrice;
      }
    }
    if (nextPrice == null) {
      skipped.push({ sku: row.sku, reason: "no competitor price" });
      continue;
    }

    updates.push({
      ourProductId: row.ourProductId,
      sku: row.sku,
      ourPrice: row.ourPrice,
      theirPrice,
      nextPrice,
      largeDrop:
        typeof row.ourPrice === "number" &&
        row.ourPrice > 0 &&
        nextPrice < row.ourPrice * (1 - LARGE_DROP),
    });
  }

  return {
    percent,
    updates,
    skipped,
    largeDrops: updates.filter((item) => item.largeDrop).length,
  };
};

const applyPricePlan = async (tenantId, plan) => {
  if (plan.updates.length === 0) {
    return { modified: 0 };
  }

  const appliedAt = new Date();
  const result = await Product.bulkWrite(
    plan.updates.map((item) => ({
      updateOne: {
        filter: {
          _id: item.ourProductId,
          tenantId,
          isDeleted: false,
        },
        update: {
          $set: {
            price: item.nextPrice,
            "attributes.priceRule": {
              percent: plan.percent,
              versus: "competitor",
              previousPrice: item.ourPrice,
              competitorPrice: item.theirPrice,
              appliedAt,
            },
          },
        },
      },
    }))
  );

  return { modified: result.modifiedCount || 0 };
};

module.exports = {
  loadAccepted,
  parsePercent,
  pricePlan,
  applyPricePlan,
};
