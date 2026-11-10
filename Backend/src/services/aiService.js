const mongoose = require("mongoose");
const { Anthropic } = require("@anthropic-ai/sdk");
const AiUsage = require("../models/aiUsageModel");
const { AI_MODEL } = require("../config/env");
const { logError } = require("../utils/logger");

// Server-side refusal fallback is only offered on these model lines.
const FALLBACK_MODELS = /^claude-(opus-5|sonnet-5-5|fable-5)/;

let client = null;

const isAiConfigured = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

// Created on first use so the server still starts without an API key.
const getClient = () => {
  if (!client) client = new Anthropic({ maxRetries: 3, timeout: 120_000 });
  return client;
};

const aiError = (message, status = 502) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const recordUsage = async (tenantId, feature, response) => {
  const usage = response?.usage || {};
  try {
    await AiUsage.create({
      tenantId,
      feature,
      model: response?.model,
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0,
      cacheWriteTokens: usage.cache_creation_input_tokens || 0,
      stopReason: response?.stop_reason,
    });
  } catch (error) {
    // Usage logging must never break the feature itself.
    logError("ai.usage", error);
  }
};

/**
 * Ask Claude for one JSON answer that follows `schema`.
 *
 * - `system` must be the same text on every call: it is cached, so after the
 *   first call those tokens are billed at a small fraction of the normal price.
 * - `input` is the per-call data; keep it as small as possible.
 * - Returns `{ data, model, usage }`; `data` is the parsed JSON.
 */
const askJson = async ({
  tenantId,
  feature,
  system,
  input,
  schema,
  validate,
  maxTokens = 2000,
  effort = "low",
}) => {
  const model = AI_MODEL;
  const request = {
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

  const response = request.betas
    ? await getClient().beta.messages.create(request)
    : await getClient().messages.create(request);
  await recordUsage(tenantId, feature, response);

  if (response.stop_reason === "refusal") {
    throw aiError("The AI declined this request");
  }
  if (response.stop_reason === "max_tokens") {
    throw aiError("The AI answer was cut off (max_tokens)");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) throw aiError("The AI returned no answer");

  let data;
  try {
    data = JSON.parse(textBlock.text);
  } catch {
    throw aiError("The AI returned invalid JSON");
  }
  if (validate) {
    const parsed = validate.safeParse(data);
    if (!parsed.success) throw aiError("The AI answer did not match the schema");
    data = parsed.data;
  }

  return { data, model: response.model, usage: response.usage };
};

// Token totals for a tenant, for showing spend and enforcing plan limits later.
const usageSummary = async (tenantId, since) => {
  const match = { tenantId: new mongoose.Types.ObjectId(String(tenantId)) };
  if (since) match.createdAt = { $gte: since };
  const [row] = await AiUsage.aggregate([
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
  const { _id, ...totals } = row || {
    _id: null,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
  return totals;
};

module.exports = {
  Anthropic,
  askJson,
  isAiConfigured,
  usageSummary,
};
