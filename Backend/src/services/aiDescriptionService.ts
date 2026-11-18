import crypto from "crypto";
import { z } from "zod";
import type { Types } from "mongoose";
import CatalogSource from "../models/catalogSourceModel";
import Product, { type ProductRecord } from "../models/productModel";
import Match from "../models/matchModel";
import { askJson, Anthropic } from "./aiService";
import { realSku } from "../utils/productCodes";
import { productFactsHash } from "../utils/productFacts";
import { HttpError, errorMessage } from "../utils/httpError";
import { logError } from "../utils/logger";
import { AI_CONCURRENCY, AI_MAX_DESCRIPTIONS, AI_MODEL } from "../config/env";
import type { Id, MatchAgainst } from "../types/domain";

// Bump when the prompt or input format changes, so descriptions are rewritten.
const PROMPT_VERSION = "description-v1";
const MAX_REFERENCES = 2;
// Below this much real text there is nothing to describe without guessing.
const MIN_SOURCE_CHARS = 40;

// Fixed text: identical on every call so it is served from the prompt cache.
const SYSTEM_PROMPT = `You write product descriptions for an online store that sells auto and truck parts and accessories.

You get one of "our" products, plus up to ${MAX_REFERENCES} reference listings of the SAME part from a manufacturer or another seller. Write a store-ready description for our product.

Input is compact JSON. Keys (missing keys mean unknown):
- ours: our product. n name, b brand, m manufacturer part number, s SKU, c category, f fitment (vehicles it fits), a attributes (specs), d current description.
- refs: reference listings. t "manufacturer" or "competitor", then the same keys as ours.

Rules:
1. Use only facts that appear in the input. Never invent specifications, dimensions, materials, finishes, fitment, years, certifications, warranty terms, included parts or installation claims. If a fact is not given, leave it out.
2. Reference listings are other companies' text. Use their facts, but write entirely new wording. Do not copy sentences or distinctive phrases.
3. If our product and a reference disagree, trust our product. Manufacturer references are more reliable than competitor references.
4. Never mention other sellers, competitor names, prices, discounts, shipping, stock or availability.
5. Plain, confident, specific tone for truck owners and fleet buyers. No hype words ("best", "ultimate", "premium quality", "perfect"), no exclamation marks, no emojis. US English.
6. Format as HTML using only <p>, <ul>, <li> and <strong>:
   - one short opening paragraph: what the part is and what it does;
   - a <ul> of key features and specs (only those given);
   - a fitment paragraph starting with <strong>Fits:</strong> when fitment is given.
   Aim for 80 to 200 words. Shorter is fine when there are few facts.
7. If the input does not contain enough real information to describe the part beyond its name, set enough_info to false and html to "".

Answer with JSON only:
- html: the description HTML (or "" when enough_info is false)
- enough_info: true or false`;

const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    html: { type: "string" },
    enough_info: { type: "boolean" },
  },
  required: ["html", "enough_info"],
  additionalProperties: false,
};

const Answer = z.object({
  html: z.string().max(20000),
  enough_info: z.boolean(),
});

const PRODUCT_FIELDS =
  "_id sku mpn gtin name brand description category fitment attributes aiDescription";
const REFERENCE_FIELDS = "name brand mpn fitment attributes description";

// ---------- compact input ----------

const plain = (value: unknown) =>
  String(value ?? "")
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const clip = (value: unknown, max: number) => {
  const text = plain(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const compactAttributes = (attributes: unknown) => {
  if (!attributes || typeof attributes !== "object") return undefined;
  const entries = Object.entries(attributes as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== "" && typeof value !== "object")
    .slice(0, 12)
    .map(([key, value]) => [clip(key, 40), clip(value, 80)]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const dropEmpty = (record: Record<string, unknown>) => {
  for (const key of Object.keys(record)) {
    if (record[key] === "" || record[key] === undefined) delete record[key];
  }
  return record;
};

type Facts = Pick<ProductRecord, "name" | "brand" | "mpn" | "fitment" | "attributes" | "description"> & {
  category?: string | null;
  sku?: string | null;
};

const compactFacts = (product: Facts, descriptionChars: number) =>
  dropEmpty({
    n: clip(product.name, 160),
    b: clip(product.brand, 40),
    m: clip(product.mpn, 40),
    s: product.sku !== undefined ? clip(realSku(product), 40) : undefined,
    c: clip(product.category, 80),
    f: clip(product.fitment, 300),
    a: compactAttributes(product.attributes),
    d: clip(product.description, descriptionChars),
  });

interface Reference {
  type: MatchAgainst;
  product: Facts;
}

const buildInput = (ours: ProductRecord, references: Reference[]) =>
  JSON.stringify({
    ours: compactFacts(ours, 1500),
    refs: references.map((ref) => ({ t: ref.type, ...compactFacts(ref.product, 1200) })),
  });

// Real text the AI can work from: descriptions, fitment, specs.
const sourceChars = (ours: ProductRecord, references: Reference[]) =>
  [ours, ...references.map((ref) => ref.product)].reduce(
    (total, product) =>
      total +
      plain(product.description).length +
      plain(product.fitment).length +
      Object.keys(compactAttributes(product.attributes) ?? {}).length * 10,
    0
  );

// ---------- HTML cleanup ----------

const ALLOWED_TAGS = new Set(["p", "ul", "ol", "li", "strong", "em", "br"]);

// Keeps only simple formatting tags, with no attributes, so nothing from the
// AI (or the scraped text it read) can add scripts, links or styles.
const sanitizeHtml = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?([a-zA-Z0-9]+)\b[^>]*>/g, (tag, name: string) => {
      const tagName = name.toLowerCase();
      if (!ALLOWED_TAGS.has(tagName)) return "";
      if (tagName === "br") return "<br>";
      return tag.startsWith("</") ? `</${tagName}>` : `<${tagName}>`;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// ---------- references from accepted matches ----------

// Accepted manufacturer and competitor matches for each of our products,
// manufacturer first (more reliable), at most MAX_REFERENCES each.
const loadReferences = async (tenantId: Id, ourIds: Types.ObjectId[]) => {
  const matches = await Match.find({
    tenantId,
    status: "accepted",
    ourProductId: { $in: ourIds },
  })
    .select("ourProductId theirProductId against score")
    .sort({ score: -1 })
    .populate<{ theirProductId: ProductRecord | null }>({
      path: "theirProductId",
      select: REFERENCE_FIELDS,
      match: { isDeleted: false },
    })
    .lean();

  const byProduct = new Map<string, Reference[]>();
  for (const match of matches) {
    if (!match.theirProductId) continue;
    const key = String(match.ourProductId);
    const list = byProduct.get(key) ?? [];
    list.push({ type: match.against, product: match.theirProductId });
    byProduct.set(key, list);
  }
  for (const [key, list] of byProduct) {
    list.sort((a, b) => Number(b.type === "manufacturer") - Number(a.type === "manufacturer"));
    byProduct.set(key, list.slice(0, MAX_REFERENCES));
  }
  return byProduct;
};

// ---------- the job ----------

export interface AiDescriptionJob {
  catalogId: string;
  status: "running" | "finished" | "failed";
  total: number;
  // Already up to date: nothing changed since the last description.
  upToDate: number;
  written: number;
  notEnoughInfo: number;
  // Left for the next run because this run reached its limit.
  skipped: number;
  errors: number;
  aiCalls: number;
  limit: number;
  stopReason: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

const jobs = new Map<string, AiDescriptionJob>();

const getAiDescriptionJob = (tenantId: Id) => jobs.get(String(tenantId)) || null;

type Outcome = "upToDate" | "written" | "notEnoughInfo" | "skipped";

const describeOne = async (
  tenantId: Id,
  product: ProductRecord,
  references: Reference[],
  reserveCall: () => boolean
): Promise<Outcome> => {
  const input = buildInput(product, references);
  const inputHash = crypto
    .createHash("sha256")
    .update([PROMPT_VERSION, AI_MODEL, input].join("\n"))
    .digest("hex");
  if (product.aiDescription?.inputHash === inputHash) return "upToDate";

  if (sourceChars(product, references) < MIN_SOURCE_CHARS) return "notEnoughInfo";
  if (!reserveCall()) return "skipped";

  const { data, model } = await askJson({
    tenantId,
    feature: "description",
    system: SYSTEM_PROMPT,
    input,
    schema: ANSWER_SCHEMA,
    validate: Answer,
    maxTokens: 4000,
  });

  const html = data.enough_info ? sanitizeHtml(data.html) : "";
  await Product.updateOne(
    { _id: product._id, tenantId },
    {
      $set: {
        aiDescription: {
          html,
          factsHash: productFactsHash(product),
          inputHash,
          model,
          generatedAt: new Date(),
        },
      },
    }
  );
  return html ? "written" : "notEnoughInfo";
};

const runJob = async (job: AiDescriptionJob, tenantId: Id, catalogId: Types.ObjectId) => {
  try {
    const products = await Product.find({ tenantId, sourceId: catalogId, isDeleted: false })
      .select(PRODUCT_FIELDS)
      .sort({ name: 1 })
      .lean();
    job.total = products.length;
    const references = await loadReferences(
      tenantId,
      products.map((product) => product._id)
    );

    const reserveCall = () => {
      if (job.aiCalls >= AI_MAX_DESCRIPTIONS) return false;
      job.aiCalls += 1;
      return true;
    };

    let next = 0;
    const worker = async () => {
      while (next < products.length && !job.stopReason) {
        const product = products[next];
        next += 1;
        if (!product) continue;
        try {
          const outcome = await describeOne(
            tenantId,
            product,
            references.get(String(product._id)) ?? [],
            reserveCall
          );
          job[outcome] += 1;
        } catch (error) {
          job.errors += 1;
          logError("ai.description", error, { productId: String(product._id) });
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
    logError("ai.descriptionJob", error);
    job.status = "failed";
    job.stopReason = errorMessage(error);
  } finally {
    job.finishedAt = new Date();
    console.log(
      `[ai] descriptions tenant=${tenantId} catalog=${catalogId} status=${job.status} total=${job.total} written=${job.written} upToDate=${job.upToDate} notEnoughInfo=${job.notEnoughInfo} skipped=${job.skipped} aiCalls=${job.aiCalls} errors=${job.errors}`
    );
  }
};

// Starts in the background and returns at once; poll getAiDescriptionJob.
const startAiDescriptions = async (tenantId: Id, catalogId: string) => {
  const key = String(tenantId);
  if (jobs.get(key)?.status === "running") {
    throw new HttpError("AI descriptions are already being written for this workspace", 409);
  }
  const catalog = await CatalogSource.findOne({ _id: catalogId, tenantId, isDeleted: false })
    .select("_id type")
    .lean();
  if (!catalog) throw new HttpError("Catalog not found", 404);
  if (catalog.type !== "our_catalog") {
    throw new HttpError("AI descriptions are written for your company catalog", 400);
  }

  const job: AiDescriptionJob = {
    catalogId: String(catalog._id),
    status: "running",
    total: 0,
    upToDate: 0,
    written: 0,
    notEnoughInfo: 0,
    skipped: 0,
    errors: 0,
    aiCalls: 0,
    limit: AI_MAX_DESCRIPTIONS,
    stopReason: null,
    startedAt: new Date(),
    finishedAt: null,
  };
  jobs.set(key, job);
  // Not awaited: the request returns while the job runs in the background.
  void runJob(job, tenantId, catalog._id);
  return job;
};

// How many products in a catalog have a current AI description.
const descriptionCounts = async (tenantId: Id, catalogId: string) => {
  const products = await Product.find({ tenantId, sourceId: catalogId, isDeleted: false })
    .select("name brand mpn category fitment description attributes aiDescription")
    .lean();
  const ready = products.filter(
    (product) =>
      product.aiDescription?.html &&
      product.aiDescription.factsHash === productFactsHash(product)
  ).length;
  return { total: products.length, ready };
};

export {
  startAiDescriptions,
  getAiDescriptionJob,
  descriptionCounts,
  // Exported for tests.
  sanitizeHtml,
  buildInput,
  sourceChars,
  SYSTEM_PROMPT,
};
