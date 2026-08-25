import { Schema, model, Document } from "mongoose";

export interface ManufacturerDocument extends Document {
  name: string;
  brands: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ManufacturerSchema = new Schema<ManufacturerDocument>(
  {
    name: { type: String, required: true, unique: true },
    brands: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Manufacturer = model<ManufacturerDocument>(
  "Manufacturer",
  ManufacturerSchema
);
