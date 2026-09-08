import mongoose from "mongoose";

const catalogSourceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["our_catalog", "manufacturer", "competitor"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    brands: {
      type: [String],
      default: [],
    },
    url: {
      type: String,
      trim: true,
    },
    connection: {
      kind: {
        type: String,
        enum: ["api", "csv", "excel", "feed", "website"],
      },
      platform: {
        type: String,
        trim: true,
      },
      columnMap: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "error"],
      default: "active",
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

catalogSourceSchema.index({ tenantId: 1, type: 1, name: 1 });

const CatalogSource = mongoose.model("CatalogSource", catalogSourceSchema);

export default CatalogSource;
