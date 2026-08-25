import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

export interface ManufacturerImportJobData {
  processingRunId: string;
  manufacturerId: string;
  rows: Record<string, string>[];
  fieldMap: Record<string, string>;
  brandColumn?: string;
}

export interface ComparisonJobData {
  processingRunId: string;
  manufacturerId: string;
  brands: string[];
}

export interface ScrapeJobData {
  processingRunId: string;
  competitorSiteId: string;
  matchResultIds: string[];
}

const connection = getRedisConnection();

export const importQueue = new Queue<ManufacturerImportJobData>("catalogiq-import", {
  connection,
});
export const matchingQueue = new Queue<ComparisonJobData>("catalogiq-matching", {
  connection,
});
export const scrapingQueue = new Queue<ScrapeJobData>("catalogiq-scraping", {
  connection,
});
