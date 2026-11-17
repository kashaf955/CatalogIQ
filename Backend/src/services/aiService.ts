import mongoose from "mongoose";
import { Anthropic } from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { z } from "zod";
import AiUsage from "../models/aiUsageModel";
import { AI_MODEL } from "../config/env";
import { logError } from "../utils/logger";
import { HttpError } from "../utils/httpError";
import type { Id } from "../types/domain";

// Server-side refusal fallback is only offered on these model lines.
const FALLBACK_MODELS = /^claude-(opus-5|sonnet-5-5|fable-5)/;

let client: Anthropic | null = null;

const isAiConfigured = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

// Created on first use so the server still starts without an API key.
const getClient = () => {
  if (!client) client = new Anthropic({ maxRetries: 3, timeout: 120_000 });
  return client;
};

const aiError = (message: string, status = 502) => new HttpError(message, status);

const recordUsage = async (tenantId: Id, feature: string, response: BetaMessage) => {
  const usage = response.usage;
  try {
    await AiUsage.create({
      tenantId,
      feature,
      model: response.model,
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0,
      cacheWriteTokens: usage.cache_creation_input_tokens || 0,
      stopReason: response.stop_reason ?? undefined,
    });
  } catch (error) {
    // Usage logging must never break the feature itself.
    logError("ai.usage", error);
  }
};

interface AskJsonOptions<T> {
  tenantId: Id;
  // Name stored with the usage row, e.g. "match-check".
  feature: string;
  system: string;
  input: string;
  // JSON schema sent to the API; the answer is guaranteed to follow it.
  schema: Record<string, unknown>;
  // Zod schema the parsed answer is checked against before it is returned.
  validate: z.ZodType<T>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
}

/**
 * Ask Claude for one JSON answer that follows `schema`.
 *
 * - `system` must be the same text on every call: it is cached, so after the
 *   first call those tokens are billed at a small fraction of the normal price.
 * - `input` is the per-call data; keep it as small as possible.
 * - Returns `{ data, model, usage }`; `data` is the parsed, validated JSON.
 */
const askJson = async <T>({
  tenantId,
  feature,
  system,
  input,
  schema,
  validate,
  maxTokens = 2000,
  effort = "low",
}: AskJsonOptions<T>) => {
  const model = AI_MODEL;
  const request: MessageCreateParamsNonStreaming = {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: input }],
    output_config: {
      effort,
      format: { type: "json_schema", schema },
    },
  };
  if (FALLBACK_MODELS.test(model)) {
    // If the model declines, the API retries on Anthropic's recommended fallback.
    request.betas = ["server-side-fallback-2026-07-01"];
    request.fallbacks = "default";
  }

  // The beta endpoint serves plain requests too, so one response type covers both.
  const response = await getClient().beta.messages.create(request);
  await recordUsage(tenantId, feature, response);

  if (response.stop_reason === "refusal") {
    throw aiError("The AI declined this request");
  }
  if (response.stop_reason === "max_tokens") {
    throw aiError("The AI answer was cut off (max_tokens)");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) throw aiError("The AI returned no answer");

  let raw: unknown;
  try {
    raw = JSON.parse(textBlock.text);
  } catch {
    throw aiError("The AI returned invalid JSON");
  }
  const parsed = validate.safeParse(raw);
  if (!parsed.success) throw aiError("The AI answer did not match the schema");

  return { data: parsed.data, model: response.model, usage: response.usage };
};

export interface UsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

// Token totals for a tenant, for showing spend and enforcing plan limits later.
const usageSummary = async (tenantId: Id, since?: Date): Promise<UsageTotals> => {
  const match: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(String(tenantId)),
  };
  if (since) match.createdAt = { $gte: since };
  const [row] = await AiUsage.aggregate<UsageTotals & { _id: null }>([
    { $match: match },
    {
      $group: {
        _id: null,
        calls: { $sum: 1 },
        inputTokens: { $sum: "$inputTokens" },
        outputTokens: { $sum: "$outputTokens" },
        cacheReadTokens: { $sum: "$cacheReadTokens" },
        cacheWriteTokens: { $sum: "$cacheWriteTokens" },
      },
    },
  ]);
  if (!row) {
    return { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  }
  const { _id, ...totals } = row;
  return totals;
};

export {
  Anthropic,
  askJson,
  isAiConfigured,
  usageSummary,
};
