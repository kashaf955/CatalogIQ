import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnection } from "./connection";
import { connectDB } from "../config/db";
import {
  ManufacturerImportJobData,
  ComparisonJobData,
  ScrapeJobData,
} from "./queues";
import { importManufacturerRows } from "../services/manufacturerImportService";
import { runManufacturerComparison } from "../services/matchingEngine";
import { runScrapeForMatches } from "../services/competitorScrapeService";
import { ProcessingRun } from "../models/ProcessingRun";

/**
 * Standalone worker process for background jobs (spec sections 23-24).
 * Run with `npm run worker` once Redis is available; it calls the exact same
 * service functions the synchronous API routes use, so behavior is
 * identical whether a job runs inline or through the queue.
 */
const connection = getRedisConnection();

const importWorker = new Worker<ManufacturerImportJobData>(
  "catalogiq-import",
  async (job) => {
    await importManufacturerRows(
      job.data.manufacturerId,
      job.data.rows,
      job.data.fieldMap,
      job.data.brandColumn,
      job.data.processingRunId
    );
  },
  { connection }
);

const matchingWorker = new Worker<ComparisonJobData>(
  "catalogiq-matching",
  async (job) => {
    await ProcessingRun.findByIdAndUpdate(job.data.processingRunId, {
      status: "running",
      startedAt: new Date(),
    });
    try {
      const result = await runManufacturerComparison(job.data.manufacturerId, job.data.brands);
      await ProcessingRun.findByIdAndUpdate(job.data.processingRunId, {
        status: "completed",
        totalItems: result.manufacturerProductsProcessed,
        processedItems: result.matchResultsWritten,
        finishedAt: new Date(),
      });
    } catch (err) {
      await ProcessingRun.findByIdAndUpdate(job.data.processingRunId, {
        status: "failed",
        errorMessages: [(err as Error).message],
        errorCount: 1,
        finishedAt: new Date(),
      });
      throw err;
    }
  },
  { connection }
);

const scrapingWorker = new Worker<ScrapeJobData>(
  "catalogiq-scraping",
  async (job) => {
    await runScrapeForMatches(
      job.data.competitorSiteId,
      job.data.matchResultIds,
      job.data.processingRunId
    );
  },
  { connection }
);

async function start() {
  await connectDB();
  console.log("CatalogIQ background worker started (import/matching/scraping queues)");
}

start().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});

for (const worker of [importWorker, matchingWorker, scrapingWorker]) {
  worker.on("failed", (job, err) => {
    console.error(`[queue] job ${job?.id} failed:`, err.message);
  });
}
