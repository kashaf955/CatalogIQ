const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ["trial", "starter", "growth", "scale"],
      default: "trial",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "cancelled"],
      default: "active",
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    // Matches scoring at or above this skip the review queue; null = off.
    autoAcceptScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 90,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Tenant = mongoose.model("Tenant", tenantSchema);

module.exports = Tenant;
