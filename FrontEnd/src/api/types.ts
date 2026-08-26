export interface StandardProductFields {
  sku?: string;
  mpn?: string;
  name: string;
  brand?: string;
  description?: string;
  gtin?: string;
  price?: number;
  images?: string[];
  category?: string;
  variants?: string[];
  weight?: string;
  dimensions?: string;
  material?: string;
  finish?: string;
  fitment?: string;
  availability?: string;
}

export interface OurProduct extends StandardProductFields {
  _id: string;
  sourceType: "api" | "csv" | "excel" | "feed";
  updatedAt: string;
}

export type ManufacturerStatus = "active" | "discontinued" | "replacement" | "out_of_stock" | "unknown";

export interface Manufacturer {
  _id: string;
  name: string;
  brands: string[];
  createdAt: string;
}

export interface ManufacturerProduct extends StandardProductFields {
  _id: string;
  manufacturer: string;
  brand: string;
  mpn: string;
  status: ManufacturerStatus;
  replacementMpn?: string;
  updatedAt: string;
}

export interface CompetitorSelectors {
  searchUrlTemplate?: string;
  resultLinkSelector?: string;
  name?: string;
  price?: string;
  sku?: string;
  brand?: string;
  description?: string;
  images?: string;
  availability?: string;
}

export interface CompetitorSite {
  _id: string;
  name: string;
  baseUrl: string;
  selectors?: CompetitorSelectors;
}

export interface CompetitorProduct extends StandardProductFields {
  _id: string;
  competitorSite: string;
  url: string;
  discoveryMethod: string;
  lastCheckedAt: string;
}

export type MatchStatus = "matched" | "discontinued" | "replacement_available" | "no_match" | "needs_review";
export type ReviewStatus = "pending" | "approved" | "rejected" | "variant" | "needs_info";

export interface MatchResult {
  _id: string;
  ourProduct?: OurProduct;
  manufacturerProduct?: ManufacturerProduct;
  competitorProduct?: CompetitorProduct;
  manufacturer?: string;
  brand?: string;
  matchStatus: MatchStatus;
  confidence: number;
  decisionSource: "rule" | "ai" | "human";
  matchedSignal?: string;
  reviewStatus: ReviewStatus;
  notes?: string;
  aiReasoning?: string;
  updatedAt: string;
}

export type ProcessingRunType =
  | "our_catalog_import"
  | "manufacturer_import"
  | "matching"
  | "competitor_scrape"
  | "ai_verification";
export type ProcessingRunStatus = "queued" | "running" | "completed" | "failed";

export interface ProcessingRun {
  _id: string;
  type: ProcessingRunType;
  status: ProcessingRunStatus;
  totalItems: number;
  processedItems: number;
  errorCount: number;
  errorMessages: string[];
  createdAt: string;
  finishedAt?: string;
}

export interface OverviewStats {
  totalProducts: number;
  totalManufacturerProducts: number;
  productsProcessed: number;
  matched: number;
  needsReview: number;
  discontinued: number;
  replacementAvailable: number;
  noMatch: number;
  pendingReview: number;
}

export interface UploadPreview {
  headers: string[];
  suggestedMapping: Record<string, string>;
  suggestedBrandColumn?: string;
  sampleRows: Record<string, string>[];
  totalRows: number;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
  brandsSeen?: string[];
}
