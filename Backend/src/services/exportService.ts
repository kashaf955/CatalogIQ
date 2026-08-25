import Papa from "papaparse";
import { MatchResult } from "../models/MatchResult";

export interface ExportFilters {
  manufacturer?: string;
  brand?: string;
}

/**
 * Builds the upload-ready CSV described in the "Product Update &
 * Upload-Ready CSV" spec section: only human-approved results are exported,
 * carrying the verified data from every source that contributed to the
 * decision.
 */
export async function buildUpdateCsv(filters: ExportFilters): Promise<string> {
  const query: Record<string, unknown> = { reviewStatus: "approved" };
  if (filters.manufacturer) query.manufacturer = filters.manufacturer;
  if (filters.brand) query.brand = filters.brand;

  const results = await MatchResult.find(query)
    .populate("ourProduct")
    .populate("manufacturerProduct")
    .populate("competitorProduct")
    .lean();

  const rows = results.map((r) => {
    const our = r.ourProduct as unknown as Record<string, unknown> | undefined;
    const mfg = r.manufacturerProduct as unknown as Record<string, unknown> | undefined;
    const comp = r.competitorProduct as unknown as Record<string, unknown> | undefined;
    return {
      sku: our?.sku ?? "",
      mpn: our?.mpn ?? mfg?.mpn ?? "",
      name: our?.name ?? mfg?.name ?? "",
      brand: r.brand ?? "",
      price: our?.price ?? "",
      manufacturer_status: mfg?.status ?? "",
      replacement_mpn: mfg?.replacementMpn ?? "",
      competitor_price: comp?.price ?? "",
      competitor_availability: comp?.availability ?? "",
      match_status: r.matchStatus,
      notes: r.notes ?? "",
    };
  });

  return Papa.unparse(rows);
}
