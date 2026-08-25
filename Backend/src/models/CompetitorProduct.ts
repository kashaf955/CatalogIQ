import { Schema, model, Document, Types } from "mongoose";

export type CompetitorDiscoveryMethod =
  | "exact_mpn"
  | "exact_gtin"
  | "sku"
  | "brand_mpn"
  | "brand_name"
  | "name_specs"
  | "external_search";

export interface CompetitorProductDocument extends Document {
  competitorSite: Types.ObjectId;
  url: string;
  sku?: string;
  mpn?: string;
  name: string;
  brand?: string;
  description?: string;
  price?: number;
  availability?: string;
  specifications: Map<string, string>;
  dimensions?: string;
  weight?: string;
  material?: string;
  finish?: string;
  fitment?: string;
  variants: string[];
  images: string[];
  discoveryMethod: CompetitorDiscoveryMethod;
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorProductSchema = new Schema<CompetitorProductDocument>(
  {
    competitorSite: {
      type: Schema.Types.ObjectId,
      ref: "CompetitorSite",
      required: true,
      index: true,
    },
    url: { type: String, required: true },
    sku: { type: String },
    mpn: { type: String, index: true },
    name: { type: String, required: true },
    brand: { type: String },
    description: { type: String },
    price: { type: Number },
    availability: { type: String },
    specifications: { type: Map, of: String, default: {} },
    dimensions: { type: String },
    weight: { type: String },
    material: { type: String },
    finish: { type: String },
    fitment: { type: String },
    variants: { type: [String], default: [] },
    images: { type: [String], default: [] },
    discoveryMethod: {
      type: String,
      enum: [
        "exact_mpn",
        "exact_gtin",
        "sku",
        "brand_mpn",
        "brand_name",
        "name_specs",
        "external_search",
      ],
      required: true,
    },
    lastCheckedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const CompetitorProduct = model<CompetitorProductDocument>(
  "CompetitorProduct",
  CompetitorProductSchema
);
