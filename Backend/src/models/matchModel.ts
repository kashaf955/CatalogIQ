import mongoose from "mongoose";
import type { ProductRecord } from "./productModel";

const matchSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    against: {
      type: String,
      enum: ["manufacturer", "competitor"],
      required: true,
    },
    ourProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    theirProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    theirSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CatalogSource",
    },
    score: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "ignored"],
      default: "pending",
    },
    autoAccepted: {
      type: Boolean,
      default: false,
    },
    lastRunAt: {
      type: Date,
    },
    // Set by the AI check. It only advises; a person still accepts or rejects.
    aiVerdict: {
      type: String,
      enum: ["match", "no_match", null],
      default: null,
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    aiReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

matchSchema.index(
  { tenantId: 1, ourProductId: 1, theirProductId: 1 },
  { unique: true }
);
matchSchema.index({ tenantId: 1, against: 1, status: 1 });

const Match = mongoose.model("Match", matchSchema);

// A plain Match document, as returned by .lean().
export type MatchRecord = mongoose.InferSchemaType<typeof matchSchema> & {
  _id: mongoose.Types.ObjectId;
};

// A match after .populate() of both products. Populate with `match` leaves a
// product null when it was deleted, so filter those out before using this type.
export type PopulatedMatch<P = ProductRecord> = Omit<
  MatchRecord,
  "ourProductId" | "theirProductId"
> & {
  ourProductId: P;
  theirProductId: P;
};

// Whether both populated products still exist.
export const hasBothProducts = <M extends { ourProductId: unknown; theirProductId: unknown }>(
  match: M
): match is M & {
  ourProductId: NonNullable<M["ourProductId"]>;
  theirProductId: NonNullable<M["theirProductId"]>;
} => Boolean(match.ourProductId && match.theirProductId);

export default Match;
