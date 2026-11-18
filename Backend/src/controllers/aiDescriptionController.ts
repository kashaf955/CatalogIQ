import type { Request, Response } from "express";
import {
  descriptionCounts,
  getAiDescriptionJob,
  startAiDescriptions,
} from "../services/aiDescriptionService";
import { isAiConfigured } from "../services/aiService";
import { logError } from "../utils/logger";
import { errorMessage, errorStatus } from "../utils/httpError";

const catalogIdOf = (req: Request) => String(req.params.id);

// Progress of the current run (if it is for this catalog) and how many
// products already have a current AI description.
const getAiDescriptions = async (req: Request, res: Response) => {
  try {
    const catalogId = catalogIdOf(req);
    const job = getAiDescriptionJob(req.tenant.id);
    const counts = await descriptionCounts(req.tenant.id, catalogId);
    return res.status(200).json({
      configured: isAiConfigured(),
      job: job && job.catalogId === catalogId ? job : null,
      ...counts,
    });
  } catch (error) {
    logError("catalogs.aiDescriptionsStatus", error, { id: req.params.id });
    return res.status(errorStatus(error)).json({ message: errorMessage(error) });
  }
};

const runAiDescriptions = async (req: Request, res: Response) => {
  try {
    if (!isAiConfigured()) {
      return res
        .status(503)
        .json({ message: "AI is not set up: add ANTHROPIC_API_KEY to the server .env" });
    }
    const job = await startAiDescriptions(req.tenant.id, catalogIdOf(req));
    return res.status(202).json({ message: "Writing AI descriptions", job });
  } catch (error) {
    logError("catalogs.aiDescriptions", error, { id: req.params.id });
    return res.status(errorStatus(error)).json({ message: errorMessage(error) });
  }
};

export { getAiDescriptions, runAiDescriptions };
