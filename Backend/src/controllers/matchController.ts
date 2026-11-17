import type { Request, Response } from "express";
import type { QueryFilter } from "mongoose";
import Match, { hasBothProducts, type MatchRecord, type PopulatedMatch } from "../models/matchModel";
import type { ProductRecord } from "../models/productModel";
import { isMatchAgainst, isMatchStatus } from "../types/domain";
import { runMatching } from "../services/matchService";
import {
  loadAccepted,
  parsePercent,
  pricePlan,
  applyPricePlan,
} from "../services/compareService";
import { startAiCheck, getAiCheckJob } from "../services/aiMatchService";
import { isAiConfigured, usageSummary } from "../services/aiService";
import { logError } from "../utils/logger";
import { isMatchableProduct } from "../utils/productMatchability";
import { errorMessage, errorStatus } from "../utils/httpError";

const toRow = (match: PopulatedMatch) => ({
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
  aiVerdict: match.aiVerdict || null,
  aiConfidence: match.aiConfidence ?? null,
  aiReason: match.aiReason || null,
});

const runMatches = async (req: Request, res: Response) => {
  try {
    const against = req.body?.against;
    if (!isMatchAgainst(against)) {
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
    return res.status(errorStatus(error)).json({ message: errorMessage(error) });
  }
};

const getMatches = async (req: Request, res: Response) => {
  try {
    const filter: QueryFilter<MatchRecord> = { tenantId: req.tenant.id };
    if (isMatchAgainst(req.query.against)) filter.against = req.query.against;
    if (isMatchStatus(req.query.status)) filter.status = req.query.status;

    const productFields = "sku name price sourceUrl availability status";
    const matches = await Match.find(filter)
      .sort({ score: -1, createdAt: -1 })
      .limit(5000)
      .populate<{ ourProductId: ProductRecord | null; theirProductId: ProductRecord | null }>({
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
      .filter(hasBothProducts)
      .filter((match) => isMatchableProduct(match.theirProductId))
      .map(toRow);
    return res.status(200).json(rows);
  } catch (error) {
    logError("matches.list", error);
    return res.status(500).json({ message: errorMessage(error) });
  }
};

const updateMatch = async (req: Request, res: Response) => {
  try {
    const status = req.body?.status;
    if (!isMatchStatus(status)) {
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
    return res.status(500).json({ message: errorMessage(error) });
  }
};

const getCompare = async (req: Request, res: Response) => {
  try {
    const against = isMatchAgainst(req.query.against)
      ? req.query.against
      : "competitor";
    const rows = await loadAccepted(req.tenant.id, against);
    return res.status(200).json(rows);
  } catch (error) {
    logError("matches.compare", error);
    return res.status(500).json({ message: errorMessage(error) });
  }
};

const updateComparePrices = async (req: Request, res: Response) => {
  try {
    const percent = parsePercent(req.body?.percent);
    const apply = Boolean(req.body?.apply);
    const rows = await loadAccepted(req.tenant.id, "competitor");
    const plan = pricePlan(rows, percent);

    if (!apply) {
      return res.status(200).json({
        message: `Preview: ${plan.updates.length} prices, ${plan.skipped.length} skipped, ${plan.largeDrops} down more than 30%`,
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
    return res.status(errorStatus(error)).json({ message: errorMessage(error) });
  }
};

const runAiCheck = async (req: Request, res: Response) => {
  try {
    const against = req.body?.against;
    if (!isMatchAgainst(against)) {
      return res
        .status(400)
        .json({ message: "Choose manufacturer or competitor to check against" });
    }
    if (!isAiConfigured()) {
      return res
        .status(503)
        .json({ message: "AI is not set up: add ANTHROPIC_API_KEY to the server .env" });
    }
    const job = startAiCheck(req.tenant.id, against);
    return res.status(202).json({ message: "AI check started", ...job });
  } catch (error) {
    logError("matches.aiCheck", error);
    return res.status(errorStatus(error)).json({ message: errorMessage(error) });
  }
};

const getAiCheck = async (req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usage = await usageSummary(req.tenant.id, since);
    return res.status(200).json({
      configured: isAiConfigured(),
      job: getAiCheckJob(req.tenant.id),
      usageLast30Days: usage,
    });
  } catch (error) {
    logError("matches.aiCheckStatus", error);
    return res.status(500).json({ message: errorMessage(error) });
  }
};

export {
  runAiCheck,
  getAiCheck,
  runMatches,
  getMatches,
  getCompare,
  updateComparePrices,
  updateMatch,
};
