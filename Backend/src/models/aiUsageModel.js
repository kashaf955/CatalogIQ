const mongoose = require("mongoose");

// One row per Claude API call, so spend can be reported and limited per tenant.
const aiUsageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    feature: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    cacheReadTokens: { type: Number, default: 0 },
    cacheWriteTokens: { type: Number, default: 0 },
    stopReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiUsageSchema.index({ tenantId: 1, createdAt: -1 });

const AiUsage = mongoose.model("AiUsage", aiUsageSchema);

module.exports = AiUsage;
