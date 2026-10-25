const mongoose = require("mongoose");

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
  },
  { timestamps: true }
);

matchSchema.index(
  { tenantId: 1, ourProductId: 1, theirProductId: 1 },
  { unique: true }
);
matchSchema.index({ tenantId: 1, against: 1, status: 1 });

const Match = mongoose.model("Match", matchSchema);

module.exports = Match;
