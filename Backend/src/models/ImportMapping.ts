import { Schema, model, Document, Types } from "mongoose";

export interface ImportMappingDocument extends Document {
  manufacturer?: Types.ObjectId;
  sourceType: "our_catalog" | "manufacturer";
  fieldMap: Map<string, string>; // standard field -> source column header
  brandColumn?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ImportMappingSchema = new Schema<ImportMappingDocument>(
  {
    manufacturer: { type: Schema.Types.ObjectId, ref: "Manufacturer" },
    sourceType: {
      type: String,
      enum: ["our_catalog", "manufacturer"],
      required: true,
    },
    fieldMap: { type: Map, of: String, default: {} },
    brandColumn: { type: String },
  },
  { timestamps: true }
);

export const ImportMapping = model<ImportMappingDocument>(
  "ImportMapping",
  ImportMappingSchema
);
