import { Schema, model, Document } from "mongoose";

export interface OurProductDocument extends Document {
  sku: string;
  mpn?: string;
  name: string;
  brand?: string;
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
  sourceType: "api" | "csv" | "excel" | "feed";
  createdAt: Date;
  updatedAt: Date;
}

const OurProductSchema = new Schema<OurProductDocument>(
  {
    sku: { type: String, required: true, unique: true },
    mpn: { type: String, index: true },
    name: { type: String, required: true },
    brand: { type: String, index: true },
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
    sourceType: {
      type: String,
      enum: ["api", "csv", "excel", "feed"],
      default: "csv",
    },
  },
  { timestamps: true }
);

export const OurProduct = model<OurProductDocument>(
  "OurProduct",
  OurProductSchema
);
