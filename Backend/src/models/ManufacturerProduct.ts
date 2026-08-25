import { Schema, model, Document, Types } from "mongoose";

export type ManufacturerStatus =
  | "active"
  | "discontinued"
  | "replacement"
  | "out_of_stock"
  | "unknown";

export interface ManufacturerProductDocument extends Document {
  manufacturer: Types.ObjectId;
  brand: string;
  sku?: string;
  mpn: string;
  name: string;
  description?: string;
  gtin?: string;
  price?: number;
  images: string[];
  category?: string;
  variants: string[];
  weight?: string;
  dimensions?: string;
  material?: string;
  finish?: string;
  fitment?: string;
  availability?: string;
  attributes: Map<string, string>;
  status: ManufacturerStatus;
  replacementMpn?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ManufacturerProductSchema = new Schema<ManufacturerProductDocument>(
  {
    manufacturer: {
      type: Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: true,
      index: true,
    },
    brand: { type: String, required: true, index: true },
    sku: { type: String },
    mpn: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    gtin: { type: String, index: true },
    price: { type: Number },
    images: { type: [String], default: [] },
    category: { type: String },
    variants: { type: [String], default: [] },
    weight: { type: String },
    dimensions: { type: String },
    material: { type: String },
    finish: { type: String },
    fitment: { type: String },
    availability: { type: String },
    attributes: { type: Map, of: String, default: {} },
    status: {
      type: String,
      enum: ["active", "discontinued", "replacement", "out_of_stock", "unknown"],
      default: "active",
      index: true,
    },
    replacementMpn: { type: String },
  },
  { timestamps: true }
);

ManufacturerProductSchema.index({ manufacturer: 1, mpn: 1 }, { unique: true });

export const ManufacturerProduct = model<ManufacturerProductDocument>(
  "ManufacturerProduct",
  ManufacturerProductSchema
);
