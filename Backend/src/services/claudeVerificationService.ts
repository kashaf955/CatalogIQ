import Anthropic from "@anthropic-ai/sdk";
import { MatchResult, MatchStatus } from "../models/MatchResult";
import { OurProduct } from "../models/OurProduct";
import { ManufacturerProduct } from "../models/ManufacturerProduct";
import { CompetitorProduct } from "../models/CompetitorProduct";

const MODEL = "claude-sonnet-5";

export type AiDecision =
  | "same_product"
  | "different_product"
  | "different_variant"
  | "likely_match_review_required"
  | "insufficient_information";

const DECISION_TO_STATUS: Record<AiDecision, MatchStatus> = {
  same_product: "matched",
  different_product: "no_match",
  different_variant: "needs_review",
  likely_match_review_required: "needs_review",
  insufficient_information: "needs_review",
};

let client: Anthropic | undefined;
function getClient(): Anthropic | undefined {
  if (!process.env.ANTHROPIC_API_KEY) return undefined;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Claude is only invoked for ambiguous matches surfaced by the deterministic
 * engine (spec section 17/28), never for every raw product. If no API key is
 * configured this safely no-ops rather than failing the comparison run.
 */
export async function verifyAmbiguousMatch(matchResultId: string): Promise<void> {
  const anthropic = getClient();
  if (!anthropic) {
    await MatchResult.findByIdAndUpdate(matchResultId, {
      aiReasoning: "AI verification unavailable: ANTHROPIC_API_KEY is not configured.",
    });
    return;
  }

  const result = await MatchResult.findById(matchResultId);
  if (!result) return;

  const [ourProduct, mfgProduct, competitorProduct] = await Promise.all([
    result.ourProduct ? OurProduct.findById(result.ourProduct) : null,
    result.manufacturerProduct ? ManufacturerProduct.findById(result.manufacturerProduct) : null,
    result.competitorProduct ? CompetitorProduct.findById(result.competitorProduct) : null,
  ]);

  const prompt = buildVerificationPrompt({ ourProduct, mfgProduct, competitorProduct });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const decision = parseDecision(text);
    await MatchResult.findByIdAndUpdate(matchResultId, {
      matchStatus: DECISION_TO_STATUS[decision],
      decisionSource: "ai",
      aiReasoning: text,
    });
  } catch (err) {
    await MatchResult.findByIdAndUpdate(matchResultId, {
      aiReasoning: `AI verification failed: ${(err as Error).message}`,
    });
  }
}

function buildVerificationPrompt(data: {
  ourProduct: unknown;
  mfgProduct: unknown;
  competitorProduct: unknown;
}): string {
  return [
    "You are verifying whether product records from different sources describe the same physical product.",
    "Compare the records below and respond with exactly one decision keyword on the first line:",
    "same_product | different_product | different_variant | likely_match_review_required | insufficient_information",
    "Then give a one-sentence reason on the next line.",
    "",
    `Our catalog record: ${JSON.stringify(data.ourProduct)}`,
    `Manufacturer record: ${JSON.stringify(data.mfgProduct)}`,
    `Competitor record: ${JSON.stringify(data.competitorProduct)}`,
  ].join("\n");
}

function parseDecision(text: string): AiDecision {
  const firstLine = text.trim().split("\n")[0]?.trim().toLowerCase();
  const valid: AiDecision[] = [
    "same_product",
    "different_product",
    "different_variant",
    "likely_match_review_required",
    "insufficient_information",
  ];
  return (valid.find((d) => firstLine?.includes(d)) ?? "insufficient_information");
}
