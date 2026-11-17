// Shapes of the data the CatalogIQ API sends. Keep in sync with Backend/.

export type Role = "owner" | "manager";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "trial" | "starter" | "growth" | "scale";
  status: "active" | "suspended" | "cancelled";
  autoAcceptScore?: number | null;
}

export interface AuthResponse {
  message?: string;
  user: User;
  tenant: Tenant | null;
  role: Role;
}

// Accepting an invite for an email that already has an account asks the
// person to sign in instead of starting a session.
export type AcceptInviteResponse =
  | (AuthResponse & { signIn?: false })
  | { message?: string; signIn: true };

export interface ApiErrorBody {
  message?: string;
}

export interface MessageResponse {
  message: string;
}

// ---------- catalogs ----------

export type CatalogType = "our_catalog" | "manufacturer" | "competitor";
export type ConnectionKind = "api" | "csv" | "excel" | "feed" | "website";

export interface CatalogConnection {
  kind?: ConnectionKind;
  platform?: string;
  storeHash?: string;
  columnMap?: Record<string, string>;
  // The token itself is never sent to the browser.
  accessTokenSet?: boolean;
}

export interface Catalog {
  _id: string;
  tenantId: string;
  type: CatalogType;
  name: string;
  description?: string;
  manufacturer?: string;
  brands: string[];
  url?: string;
  connection?: CatalogConnection;
  status: "active" | "inactive" | "error";
  createdAt: string;
  updatedAt: string;
}

// ---------- products ----------

export interface Product {
  _id: string;
  tenantId: string;
  sourceId: string;
  sku?: string;
  mpn?: string;
  gtin?: string;
  name: string;
  brand?: string;
  description?: string;
  price?: number;
  currency: string;
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
  fitment?: string;
  images: string[];
  category?: string;
  availability?: string;
  status?: string;
  replacementMpn?: string;
  attributes: Record<string, unknown>;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ---------- matches ----------

export type MatchAgainst = "manufacturer" | "competitor";
export type MatchStatus = "pending" | "accepted" | "rejected" | "ignored";

export interface MatchRow {
  id: string;
  against: MatchAgainst;
  score: number;
  reason?: string;
  status: MatchStatus;
  autoAccepted: boolean;
  ourSku?: string;
  ourName: string;
  ourPrice?: number;
  theirSku?: string;
  theirName: string;
  theirPrice?: number;
  theirUrl?: string;
  aiVerdict: "match" | "no_match" | null;
  aiConfidence: number | null;
  aiReason: string | null;
}

export interface MatchRunResult extends MessageResponse {
  ourProducts: number;
  theirProducts: number;
  matched: number;
  matches: number;
  autoAccepted: number;
  removed: number;
}

export interface AiCheckJob {
  against: MatchAgainst;
  status: "running" | "finished" | "failed";
  planned: number;
  done: number;
  aiCalls: number;
  cached: number;
  matched: number;
  skipped: number;
  errors: number;
  limit: number;
  stopReason: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface AiUsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AiCheckStatus {
  configured: boolean;
  job: AiCheckJob | null;
  usageLast30Days: AiUsageTotals;
}

// ---------- compare ----------

// One accepted match with our product and theirs combined.
export interface CompareRow {
  id: string;
  ourProductId: string;
  theirProductId: string;
  theirSourceId: string;
  sku: string;
  theirSku: string;
  name: string;
  brand: string;
  mpn: string;
  gtin: string;
  ourDescription: string;
  theirDescription: string;
  images: string[];
  fitment: string;
  category: string;
  ourPrice: number | null;
  theirPrice: number | null;
  // ourPrice - theirPrice; null when either price is missing.
  gap: number | null;
  ourAvailability: string;
  theirAvailability: string;
  theirUrl: string;
  score: number;
  reason?: string;
}

export interface PriceUpdate {
  ourProductId: string;
  sku: string;
  ourPrice: number | null;
  theirPrice: number | null;
  nextPrice: number;
  largeDrop: boolean;
}

export interface PricePlan extends MessageResponse {
  percent: number;
  updates: PriceUpdate[];
  skipped: { sku: string; reason: string }[];
  largeDrops: number;
  modified?: number;
}

// ---------- members ----------

export interface Member {
  id: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  inviteExpiresAt?: string | null;
  user: { id?: string; name?: string; email: string; status?: string } | null;
}
