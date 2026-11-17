import type { Types } from "mongoose";

// Shared domain values used across services and controllers.

export type CatalogType = "our_catalog" | "manufacturer" | "competitor";
export type MatchAgainst = "manufacturer" | "competitor";
export type MatchStatus = "pending" | "accepted" | "rejected" | "ignored";

export const MATCH_AGAINST: readonly MatchAgainst[] = ["manufacturer", "competitor"];
export const MATCH_STATUSES: readonly MatchStatus[] = ["pending", "accepted", "rejected", "ignored"];

export const isMatchAgainst = (value: unknown): value is MatchAgainst =>
  MATCH_AGAINST.includes(value as MatchAgainst);

export const isMatchStatus = (value: unknown): value is MatchStatus =>
  MATCH_STATUSES.includes(value as MatchStatus);

// A Mongo id as it arrives (string from a request, ObjectId from a document).
export type Id = string | Types.ObjectId;

// A product read from an import source (file, API, website) before it is saved.
export interface ProductInput {
  sku: string;
  name: string;
  mpn?: string;
  gtin?: string;
  brand?: string;
  description?: string;
  price?: number;
  currency?: string;
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
  fitment?: string;
  images?: string[];
  category?: string;
  availability?: string;
  status?: string;
  replacementMpn?: string;
  attributes?: Record<string, unknown>;
  sourceUrl?: string;
}
