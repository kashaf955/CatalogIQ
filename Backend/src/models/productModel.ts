import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CatalogSource",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    mpn: {
      type: String,
      trim: true,
    },
    gtin: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
    },
    currency: {
      type: String,
      default: "USD",
    },
    images: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      trim: true,
    },
    availability: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      trim: true,
    },
    replacementMpn: {
      type: String,
      trim: true,
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sourceUrl: {
      type: String,
      trim: true,
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

productSchema.index({ tenantId: 1, sourceId: 1, sku: 1 });
productSchema.index({ tenantId: 1, brand: 1, mpn: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
