const mongoose = require("mongoose");

// Remembers each AI decision by a hash of exactly what was sent, so the same
// question is never paid for twice. A changed product produces a new hash.
const aiMatchCheckSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    inputHash: {
      type: String,
      required: true,
    },
    kind: {
      type: String,
      enum: ["ambiguous", "unmatched"],
      required: true,
    },
    ourProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    theirSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CatalogSource",
    },
    candidateIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    // null when the AI found no candidate that is the same part.
    pickedProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    reason: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

aiMatchCheckSchema.index({ tenantId: 1, inputHash: 1 }, { unique: true });

const AiMatchCheck = mongoose.model("AiMatchCheck", aiMatchCheckSchema);

module.exports = AiMatchCheck;
