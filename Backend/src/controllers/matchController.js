const Match = require("../models/matchModel");
const { runMatching } = require("../services/matchService");
const {
  loadAccepted,
  parsePercent,
  pricePlan,
  applyPricePlan,
} = require("../services/compareService");
const { logError } = require("../utils/logger");
const { isMatchableProduct } = require("../utils/productMatchability");

const AGAINST = ["manufacturer", "competitor"];
const STATUSES = ["pending", "accepted", "rejected", "ignored"];

const toRow = (match) => ({
  id: match._id,
  against: match.against,
  score: match.score,
  reason: match.reason,
  status: match.status,
  autoAccepted: Boolean(match.autoAccepted),
  ourSku: match.ourProductId.sku,
  ourName: match.ourProductId.name,
  ourPrice: match.ourProductId.price,
  theirSku: match.theirProductId.sku,
  theirName: match.theirProductId.name,
  theirPrice: match.theirProductId.price,
  theirUrl: match.theirProductId.sourceUrl,
});

const runMatches = async (req, res) => {
  try {
    const against = req.body?.against;
    if (!AGAINST.includes(against)) {
      return res
        .status(400)
        .json({ message: "Choose manufacturer or competitor to match against" });
    }

    const result = await runMatching(
      req.tenant.id,
      against,
      req.tenant.autoAcceptScore
    );
    console.log(
      `[matches] run tenant=${req.tenant.id} against=${against} matched=${result.matched}/${result.ourProducts} matches=${result.matches} autoAccepted=${result.autoAccepted} removed=${result.removed}`
    );
    return res.status(200).json({ message: "Matching finished", ...result });
  } catch (error) {
    logError("matches.run", error);
    return res.status(error.status || 500).json({ message: error.message });
  }
};

const getMatches = async (req, res) => {
  try {
    const filter = { tenantId: req.tenant.id };
    if (AGAINST.includes(req.query.against)) filter.against = req.query.against;
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;

    const productFields = "sku name price sourceUrl availability status";
    const matches = await Match.find(filter)
      .sort({ score: -1, createdAt: -1 })
      .limit(5000)
      .populate({
        path: "ourProductId",
        select: productFields,
        match: { isDeleted: false },
      })
      .populate({
        path: "theirProductId",
        select: productFields,
        match: { isDeleted: false },
      })
      .lean();

    const rows = matches
      .filter(
        (match) =>
          match.ourProductId &&
          match.theirProductId &&
          isMatchableProduct(match.theirProductId)
      )
      .map(toRow);
    return res.status(200).json(rows);
  } catch (error) {
    logError("matches.list", error);
    return res.status(500).json({ message: error.message });
  }
};

const updateMatch = async (req, res) => {
  try {
    const status = req.body?.status;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid match status" });
    }

    const match = await Match.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.id },
      { status, autoAccepted: false },
      { returnDocument: "after" }
    );
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    return res.status(200).json({ id: match._id, status: match.status });
  } catch (error) {
    logError("matches.update", error, { id: req.params.id });
    return res.status(500).json({ message: error.message });
  }
};

const getCompare = async (req, res) => {
  try {
    const against = AGAINST.includes(req.query.against)
      ? req.query.against
      : "competitor";
    const rows = await loadAccepted(req.tenant.id, against);
    return res.status(200).json(rows);
  } catch (error) {
    logError("matches.compare", error);
    return res.status(500).json({ message: error.message });
  }
};

const updateComparePrices = async (req, res) => {
  try {
    const percent = parsePercent(req.body?.percent);
    const apply = Boolean(req.body?.apply);
    const rows = await loadAccepted(req.tenant.id, "competitor");
    const plan = pricePlan(rows, percent);

    if (!apply) {
      return res.status(200).json({
        message: `Preview: ${plan.updates.length} prices, ${plan.skipped.length} skipped`,
        ...plan,
      });
    }

    const { modified } = await applyPricePlan(req.tenant.id, plan);
    return res.status(200).json({
      message: `Updated ${modified} company prices to ${percent}% below competitor`,
      modified,
      ...plan,
    });
  } catch (error) {
    logError("matches.comparePrices", error);
    return res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = {
  runMatches,
  getMatches,
  getCompare,
  updateComparePrices,
  updateMatch,
};
