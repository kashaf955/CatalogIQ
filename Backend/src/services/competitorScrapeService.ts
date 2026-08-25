import { CompetitorSite } from "../models/CompetitorSite";
import { MatchResult } from "../models/MatchResult";
import { OurProduct } from "../models/OurProduct";
import { ManufacturerProduct } from "../models/ManufacturerProduct";
import { ProcessingRun } from "../models/ProcessingRun";
import { discoverCompetitorProduct } from "./scraperService";

export interface ScrapeRunSummary {
  attempted: number;
  found: number;
  errors: string[];
}

/**
 * Runs competitor discovery for a batch of existing MatchResults (spec
 * section 13-14). Shared by the synchronous trigger route and the
 * background scraping worker.
 */
export async function runScrapeForMatches(
  competitorSiteId: string,
  matchResultIds: string[],
  processingRunId?: string
): Promise<ScrapeRunSummary> {
  const site = await CompetitorSite.findById(competitorSiteId);
  if (!site) throw new Error("Competitor site not found");

  if (processingRunId) {
    await ProcessingRun.findByIdAndUpdate(processingRunId, {
      status: "running",
      startedAt: new Date(),
      totalItems: matchResultIds.length,
    });
  }

  let attempted = 0;
  let found = 0;
  const errors: string[] = [];

  for (const matchResultId of matchResultIds) {
    attempted += 1;
    try {
      const match = await MatchResult.findById(matchResultId);
      if (!match) {
        errors.push(`${matchResultId}: match result not found`);
        continue;
      }

      const [our, mfg] = await Promise.all([
        match.ourProduct ? OurProduct.findById(match.ourProduct) : null,
        match.manufacturerProduct ? ManufacturerProduct.findById(match.manufacturerProduct) : null,
      ]);

      const result = await discoverCompetitorProduct(site, {
        mpn: mfg?.mpn ?? our?.mpn,
        gtin: our?.gtin ?? mfg?.gtin,
        sku: our?.sku ?? mfg?.sku,
        brand: mfg?.brand ?? our?.brand,
        name: mfg?.name ?? our?.name,
      });

      if (result) {
        match.competitorProduct = result._id as never;
        await match.save();
        found += 1;
      }
    } catch (err) {
      errors.push(`${matchResultId}: ${(err as Error).message}`);
    }

    if (processingRunId) {
      await ProcessingRun.findByIdAndUpdate(processingRunId, { processedItems: attempted });
    }
  }

  if (processingRunId) {
    await ProcessingRun.findByIdAndUpdate(processingRunId, {
      status: "completed",
      errorCount: errors.length,
      errorMessages: errors.slice(0, 100),
      finishedAt: new Date(),
    });
  }

  return { attempted, found, errors };
}
