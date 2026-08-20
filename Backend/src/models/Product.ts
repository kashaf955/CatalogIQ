import { Schema, model, Document } from "mongoose";

export interface CompetitorListing {
  competitorName: string;
  url: string;
  price?: number;
  title?: string;
  lastCheckedAt?: Date;
}

export interface ProductDocument extends Document {
  name: string;
  sku: string;
  ourPrice: number;
  ourUrl?: string;
  competitors: CompetitorListing[];
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorListingSchema = new Schema<CompetitorListing>(
  {
    competitorName: { type: String, required: true },
    url: { type: String, required: true },
    price: { type: Number },
    title: { type: String },
    lastCheckedAt: { type: Date },
  },
  { _id: false }
);

const ProductSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    ourPrice: { type: Number, required: true },
    ourUrl: { type: String },
    competitors: { type: [CompetitorListingSchema], default: [] },
  },
  { timestamps: true }
);

export const Product = model<ProductDocument>("Product", ProductSchema);
