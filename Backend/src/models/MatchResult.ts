import { Schema, model, Document, Types } from "mongoose";

export type MatchStatus =
  | "matched"
  | "discontinued"
  | "replacement_available"
  | "no_match"
  | "needs_review";

export type ReviewStatus = "pending" | "approved" | "rejected" | "variant" | "needs_info";

export type DecisionSource = "rule" | "ai" | "human";

export interface MatchResultDocument extends Document {
  ourProduct?: Types.ObjectId;
  manufacturerProduct?: Types.ObjectId;
  competitorProduct?: Types.ObjectId;
  manufacturer?: Types.ObjectId;
  brand?: string;
  matchStatus: MatchStatus;
  confidence: number;
  decisionSource: DecisionSource;
  matchedSignal?: string;
  reviewStatus: ReviewStatus;
  notes?: string;
  aiReasoning?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MatchResultSchema = new Schema<MatchResultDocument>(
  {
    ourProduct: { type: Schema.Types.ObjectId, ref: "OurProduct", index: true },
    manufacturerProduct: {
      type: Schema.Types.ObjectId,
      ref: "ManufacturerProduct",
      index: true,
    },
    competitorProduct: {
      type: Schema.Types.ObjectId,
      ref: "CompetitorProduct",
      index: true,
    },
    manufacturer: { type: Schema.Types.ObjectId, ref: "Manufacturer", index: true },
    brand: { type: String, index: true },
    matchStatus: {
      type: String,
      enum: [
        "matched",
        "discontinued",
        "replacement_available",
        "no_match",
        "needs_review",
      ],
      required: true,
      index: true,
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    decisionSource: {
      type: String,
      enum: ["rule", "ai", "human"],
      required: true,
    },
    matchedSignal: { type: String },
    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "variant", "needs_info"],
      default: "pending",
      index: true,
    },
    notes: { type: String },
    aiReasoning: { type: String },
  },
  { timestamps: true }
);

export const MatchResult = model<MatchResultDocument>(
  "MatchResult",
  MatchResultSchema
);
