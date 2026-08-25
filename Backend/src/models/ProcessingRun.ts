import { Schema, model, Document, Types } from "mongoose";

export type ProcessingRunType =
  | "our_catalog_import"
  | "manufacturer_import"
  | "matching"
  | "competitor_scrape"
  | "ai_verification";

export type ProcessingRunStatus = "queued" | "running" | "completed" | "failed";

export interface ProcessingRunDocument extends Document {
  type: ProcessingRunType;
  status: ProcessingRunStatus;
  manufacturer?: Types.ObjectId;
  totalItems: number;
  processedItems: number;
  errorCount: number;
  errorMessages: string[];
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProcessingRunSchema = new Schema<ProcessingRunDocument>(
  {
    type: {
      type: String,
      enum: [
        "our_catalog_import",
        "manufacturer_import",
        "matching",
        "competitor_scrape",
        "ai_verification",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    manufacturer: { type: Schema.Types.ObjectId, ref: "Manufacturer" },
    totalItems: { type: Number, default: 0 },
    processedItems: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    errorMessages: { type: [String], default: [] },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

export const ProcessingRun = model<ProcessingRunDocument>(
  "ProcessingRun",
  ProcessingRunSchema
);
