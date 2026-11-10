const crypto = require("crypto");
const { z } = require("zod");
const CatalogSource = require("../models/catalogSourceModel");
const Product = require("../models/productModel");
const Match = require("../models/matchModel");
const AiMatchCheck = require("../models/aiMatchCheckModel");
const { askJson, Anthropic } = require("./aiService");
const { normalize } = require("../utils/productCodes");
const { isMatchableProduct } = require("../utils/productMatchability");
const { AI_MODEL, AI_MAX_CHECKS, AI_CONCURRENCY } = require("../config/env");
const { logError } = require("../utils/logger");

// Bump when the prompt or the input format changes, so old cached answers are
// not reused for a question that is now asked differently.
const PROMPT_VERSION = "match-v1";
const MAX_SHORTLIST = 3;
const MIN_SIMILARITY = 0.4;
// AI matches rank below every rule-based match (rules score 80-100).
const MAX_AI_SCORE = 79;
// A token found in more products than this says nothing about identity.
const MAX_TOKEN_POSTINGS = 2000;

// Fixed text: identical on every call so it is served from the prompt cache.
const SYSTEM_PROMPT = `You verify product matches for an auto and truck parts catalog tool.

You get one of "our" products and up to ${MAX_SHORTLIST} candidate products from one manufacturer or competitor catalog. Decide which candidate, if any, is the SAME sellable part: same manufacturer part, same size, same variant. It must be something a buyer could swap one-for-one.

Input is compact JSON. Keys on each product (missing keys mean unknown):
- i: candidate index (candidates only)
- b: brand
- n: product name
- m: manufacturer part number (MPN)
- s: SKU in that store
- g: GTIN / UPC barcode
- c: category
- f: fitment (vehicles the part fits)
- a: attributes (specs)
- d: description, shortened

How to decide:
1. Identical GTIN, or identical brand plus identical MPN, is strong evidence of the same part.
2. Different brands are different parts, unless one product clearly resells the other brand's part (the name or MPN says so).
3. Suffixes and variant words matter: 20307 and 20307-BK are different parts. So are left vs right, front vs rear, single vs pair or kit, different sizes, lengths, voltages, colors or finishes.
4. Store SKUs often carry a store prefix (PB-12345 vs 12345). A prefix alone is not a difference.
5. Similar names are NOT enough. If the specs or fitment conflict, it is not a match.
   Fitment that names different truck models or year ranges usually means a different part.
   A kit or assembly is not the same as one component of it (a headlight assembly vs a bulb).
   "Fits" or "replaces" wording means an aftermarket equivalent, not the same part, unless the brand and part number also agree.
   Missing information is not a conflict: judge on what both products state.
6. If two candidates look equally right, pick the better one but lower your confidence.
7. If nothing is clearly the same part, answer match = -1. A wrong match costs more than a missed one.

Answer with JSON only:
- match: the candidate index "i" that is the same part, or -1 for none
- confidence: 0 to 1, how sure you are of that answer (also when it is -1)
- reason: at most 15 words, naming the deciding evidence (e.g. "Same brand and MPN; candidate 1 is the black variant")

Examples of good reasons:
- "Same GTIN and brand"
- "Same MPN but candidate is a pair, ours is single"
- "Names similar but different bulb type (H11 vs 9006)"
- "Different brand, no sign of resale"`;

const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    match: { type: "integer" },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["match", "confidence", "reason"],
  additionalProperties: false,
};

const Answer = z.object({
  match: z.number().int().min(-1),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(300),
});

const LIGHT_FIELDS = "_id sourceId sku mpn gtin brand name sourceUrl availability status";
const FULL_FIELDS = `${LIGHT_FIELDS} category fitment attributes description`;

// ---------- compact product text (fewer tokens per call) ----------

const clip = (value, max) => {
  const text = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&amp;|&quot;|&#39;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const compactAttributes = (attributes) => {
  if (!attributes || typeof attributes !== "object") return undefined;
  const entries = Object.entries(attributes)
    .filter(([, value]) => value !== null && value !== "" && typeof value !== "object")
    .slice(0, 8)
    .map(([key, value]) => [clip(key, 30), clip(value, 60)]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const compactProduct = (product, index) => {
  const out = {
    i: index,
    b: clip(product.brand, 40),
    n: clip(product.name, 160),
    m: clip(product.mpn, 40),
    s: clip(product.sku, 40),
    g: clip(product.gtin, 20),
    c: clip(product.category, 60),
    f: clip(product.fitment, 160),
    a: compactAttributes(product.attributes),
    d: clip(product.description, 300),
  };
  for (const key of Object.keys(out)) {
    if (out[key] === "" || out[key] === undefined) delete out[key];
  }
  return out;
};

const buildInput = (ours, candidates) =>
  JSON.stringify({
    ours: compactProduct(ours),
    candidates: candidates.map((candidate, index) => compactProduct(candidate, index)),
  });

const hashOf = (...parts) =>
  crypto.createHash("sha256").update(parts.join("\n")).digest("hex");

// ---------- cheap shortlist for products the rules could not match ----------

const STOPWORDS = new Set([
  "the", "and", "for", "with", "of", "to", "in", "a", "an", "by", "on", "new",
]);

const tokensOf = (product) =>
  new Set(
    `${product.name || ""} ${product.mpn || ""} ${product.brand || ""}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
  );

const brandsConflict = (a, b) => {
  const left = normalize(a.brand);
  const right = normalize(b.brand);
  return Boolean(left && right && left !== right);
};

const buildTokenIndex = (products) => {
  const index = new Map();
  products.forEach((product, position) => {
    for (const token of product.tokens) {
      if (!index.has(token)) index.set(token, []);
      index.get(token).push(position);
    }
  });
  return index;
};

// Dice similarity on name/MPN/brand words, using the index so we never compare
// every pair of products.
const shortlist = (ours, theirs, index) => {
  const overlap = new Map();
  for (const token of ours.tokens) {
    const postings = index.get(token);
    if (!postings || postings.length > MAX_TOKEN_POSTINGS) continue;
    for (const position of postings) {
      overlap.set(position, (overlap.get(position) || 0) + 1);
    }
  }
  return [...overlap.entries()]
    .map(([position, shared]) => {
      const candidate = theirs[position];
      const score = (2 * shared) / (ours.tokens.size + candidate.tokens.size);
      return { candidate, score };
    })
    .filter(({ candidate, score }) => score >= MIN_SIMILARITY && !brandsConflict(ours, candidate))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SHORTLIST);
};

// ---------- deciding what to ask ----------

const productsOfType = async (tenantId, type, fields) => {
  const sources = await CatalogSource.find({ tenantId, type, isDeleted: false }).select("_id");
  return Product.find({
    tenantId,
    sourceId: { $in: sources.map((source) => source._id) },
    isDeleted: false,
  })
    .select(fields)
    .lean();
};

const groupKey = (ourId, sourceId) => `${ourId}|${sourceId}`;

// Two kinds of question:
// - "ambiguous": the rules found 2+ candidates from one source; which is right?
// - "unmatched": the rules found nothing from a source; is a similar name the same part?
const planChecks = async (tenantId, against) => {
  const [ours, theirsAll, matches] = await Promise.all([
    productsOfType(tenantId, "our_catalog", LIGHT_FIELDS),
    productsOfType(tenantId, against, LIGHT_FIELDS),
    Match.find({ tenantId, against }).select("ourProductId theirProductId theirSourceId status").lean(),
  ]);
  const theirs = theirsAll.filter(isMatchableProduct);
  const theirsById = new Map(theirs.map((product) => [String(product._id), product]));
  const sourceOf = new Map(theirsAll.map((product) => [String(product._id), product.sourceId]));

  const groups = new Map();
  for (const match of matches) {
    // Older matches may lack theirSourceId; the product knows its source.
    const source = match.theirSourceId || sourceOf.get(String(match.theirProductId));
    if (!source) continue;
    const key = groupKey(match.ourProductId, source);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(match);
  }

  const checks = [];

  for (const list of groups.values()) {
    // Once a person reviewed any candidate in the group, it is settled.
    if (list.some((match) => match.status !== "pending")) continue;
    const candidates = list
      .map((match) => theirsById.get(String(match.theirProductId)))
      .filter(Boolean)
      .slice(0, MAX_SHORTLIST);
    if (candidates.length < 2) continue;
    checks.push({
      kind: "ambiguous",
      ourProductId: list[0].ourProductId,
      theirSourceId: candidates[0].sourceId,
      candidateIds: candidates.map((candidate) => candidate._id),
      priority: 2,
    });
  }

  const bySource = new Map();
  for (const product of theirs) {
    product.tokens = tokensOf(product);
    const source = String(product.sourceId);
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source).push(product);
  }

  for (const [source, products] of bySource) {
    const index = buildTokenIndex(products);
    for (const product of ours) {
      if (groups.has(groupKey(product._id, source))) continue;
      product.tokens = product.tokens || tokensOf(product);
      if (product.tokens.size === 0) continue;
      const found = shortlist(product, products, index);
      if (found.length === 0) continue;
      checks.push({
        kind: "unmatched",
        ourProductId: product._id,
        theirSourceId: products[0].sourceId,
        candidateIds: found.map(({ candidate }) => candidate._id),
        priority: 1 + found[0].score / 10,
      });
    }
  }

  // Ambiguous rule matches first, then the most promising unmatched ones.
  checks.sort((a, b) => b.priority - a.priority);
  return checks;
};

// ---------- applying an answer to the review queue ----------

const applyDecision = async (tenantId, against, check, decision) => {
  const pickedId = decision.pickedProductId ? String(decision.pickedProductId) : null;

  if (check.kind === "ambiguous") {
    await Match.bulkWrite(
      check.candidateIds.map((candidateId) => {
        const picked = String(candidateId) === pickedId;
        return {
          updateOne: {
            filter: {
              tenantId,
              against,
              status: "pending",
              ourProductId: check.ourProductId,
              theirProductId: candidateId,
            },
            update: {
              $set: {
                aiVerdict: picked ? "match" : "no_match",
                aiConfidence: decision.confidence,
                aiReason: picked || !pickedId ? decision.reason : "AI picked another candidate",
              },
            },
          },
        };
      })
    );
    return pickedId ? 1 : 0;
  }

  if (!pickedId) return 0;
  await Match.updateOne(
    { tenantId, ourProductId: check.ourProductId, theirProductId: decision.pickedProductId },
    {
      $set: {
        aiVerdict: "match",
        aiConfidence: decision.confidence,
        aiReason: decision.reason,
      },
      $setOnInsert: {
        against,
        theirSourceId: check.theirSourceId,
        score: Math.min(MAX_AI_SCORE, Math.round(decision.confidence * 100)),
        reason: "AI",
        status: "pending",
        lastRunAt: new Date(),
      },
    },
    { upsert: true }
  );
  return 1;
};

// ---------- the job ----------

const jobs = new Map();

const getAiCheckJob = (tenantId) => jobs.get(String(tenantId)) || null;

const askOne = async (tenantId, check, productsById, reserveCall) => {
  const ours = productsById.get(String(check.ourProductId));
  const candidates = check.candidateIds
    .map((id) => productsById.get(String(id)))
    .filter(Boolean);
  if (!ours || candidates.length === 0) return null;

  const input = buildInput(ours, candidates);
  const inputHash = hashOf(PROMPT_VERSION, AI_MODEL, check.kind, input);
  const cached = await AiMatchCheck.findOne({ tenantId, inputHash }).lean();
  if (cached) return { decision: cached, cached: true };
  if (!reserveCall()) return { skipped: true };

  const { data, model } = await askJson({
    tenantId,
    feature: "match-check",
    system: SYSTEM_PROMPT,
    input,
    schema: ANSWER_SCHEMA,
    validate: Answer,
  });

  const picked = data.match >= 0 ? candidates[data.match] : null;
  const decision = await AiMatchCheck.findOneAndUpdate(
    { tenantId, inputHash },
    {
      $set: {
        kind: check.kind,
        ourProductId: check.ourProductId,
        theirSourceId: check.theirSourceId,
        candidateIds: candidates.map((candidate) => candidate._id),
        // An index outside the list is treated as "no match".
        pickedProductId: picked ? picked._id : null,
        confidence: data.confidence,
        reason: data.reason,
        model,
      },
    },
    { upsert: true, returnDocument: "after" }
  ).lean();
  return { decision, cached: false };
};

const runJob = async (job, tenantId, against) => {
  try {
    const checks = await planChecks(tenantId, against);
    job.planned = checks.length;

    const ids = new Set();
    for (const check of checks) {
      ids.add(String(check.ourProductId));
      check.candidateIds.forEach((id) => ids.add(String(id)));
    }
    const products = await Product.find({ tenantId, _id: { $in: [...ids] } })
      .select(FULL_FIELDS)
      .lean();
    const productsById = new Map(products.map((product) => [String(product._id), product]));

    // Cached answers are free; only new AI calls count against the limit.
    const reserveCall = () => {
      if (job.aiCalls >= AI_MAX_CHECKS) return false;
      job.aiCalls += 1;
      return true;
    };

    let next = 0;
    const worker = async () => {
      while (next < checks.length && !job.stopReason) {
        const check = checks[next];
        next += 1;
        try {
          const result = await askOne(tenantId, check, productsById, reserveCall);
          if (!result) continue;
          if (result.skipped) {
            job.skipped += 1;
            continue;
          }
          if (result.cached) job.cached += 1;
          job.matched += await applyDecision(tenantId, against, check, result.decision);
          job.done += 1;
        } catch (error) {
          job.errors += 1;
          logError("ai.matchCheck", error, { ourProductId: String(check.ourProductId) });
          if (
            error instanceof Anthropic.AuthenticationError ||
            error instanceof Anthropic.PermissionDeniedError
          ) {
            job.stopReason = "The Claude API key is missing or not allowed";
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, AI_CONCURRENCY) }, worker));
    job.status = job.stopReason ? "failed" : "finished";
  } catch (error) {
    logError("ai.matchCheckJob", error);
    job.status = "failed";
    job.stopReason = error.message;
  } finally {
    job.finishedAt = new Date();
    console.log(
      `[ai] match-check tenant=${tenantId} against=${against} status=${job.status} planned=${job.planned} done=${job.done} aiCalls=${job.aiCalls} cached=${job.cached} matched=${job.matched} skipped=${job.skipped} errors=${job.errors}`
    );
  }
};

// Starts in the background and returns at once; poll getAiCheckJob for progress.
const startAiCheck = (tenantId, against) => {
  const key = String(tenantId);
  const current = jobs.get(key);
  if (current && current.status === "running") {
    const error = new Error("An AI check is already running for this workspace");
    error.status = 409;
    throw error;
  }
  const job = {
    against,
    status: "running",
    planned: 0,
    done: 0,
    aiCalls: 0,
    cached: 0,
    matched: 0,
    skipped: 0,
    errors: 0,
    limit: AI_MAX_CHECKS,
    stopReason: null,
    startedAt: new Date(),
    finishedAt: null,
  };
  jobs.set(key, job);
  runJob(job, tenantId, against);
  return job;
};

module.exports = {
  startAiCheck,
  getAiCheckJob,
  // Exported for tests.
  buildInput,
  compactProduct,
  tokensOf,
  shortlist,
  buildTokenIndex,
  planChecks,
  SYSTEM_PROMPT,
};
