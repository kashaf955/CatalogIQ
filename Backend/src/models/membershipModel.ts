import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "reviewer", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["active", "invited", "disabled"],
      default: "active",
    },
  },
  { timestamps: true }
);

membershipSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

const Membership = mongoose.model("Membership", membershipSchema);

export default Membership;
