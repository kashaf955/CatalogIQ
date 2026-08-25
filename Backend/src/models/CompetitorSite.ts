import { Schema, model, Document } from "mongoose";

export interface CompetitorSelectorConfig {
  searchUrlTemplate?: string; // e.g. "https://competitor.com/search?q={query}"
  resultLinkSelector?: string;
  name?: string;
  price?: string;
  sku?: string;
  brand?: string;
  description?: string;
  images?: string;
  availability?: string;
}

export interface CompetitorSiteDocument extends Document {
  name: string;
  baseUrl: string;
  selectors: CompetitorSelectorConfig;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSelectorSchema = new Schema<CompetitorSelectorConfig>(
  {
    searchUrlTemplate: { type: String },
    resultLinkSelector: { type: String },
    name: { type: String },
    price: { type: String },
    sku: { type: String },
    brand: { type: String },
    description: { type: String },
    images: { type: String },
    availability: { type: String },
  },
  { _id: false }
);

const CompetitorSiteSchema = new Schema<CompetitorSiteDocument>(
  {
    name: { type: String, required: true, unique: true },
    baseUrl: { type: String, required: true },
    selectors: { type: CompetitorSelectorSchema, default: {} },
  },
  { timestamps: true }
);

export const CompetitorSite = model<CompetitorSiteDocument>(
  "CompetitorSite",
  CompetitorSiteSchema
);
