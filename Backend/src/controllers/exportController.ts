import type { Request, Response } from "express";
import { buildExport } from "../services/exportService";
import { asString } from "../utils/request";
import { logError } from "../utils/logger";
import { errorMessage, errorStatus } from "../utils/httpError";

const downloadExport = async (req: Request, res: Response) => {
  try {
    const file = await buildExport({
      tenantId: req.tenant.id,
      sourceId: asString(req.query.sourceId),
      scope: req.query.scope || "accepted",
      format: req.query.format || "csv",
      against: req.query.against,
    });

    res.setHeader("Content-Type", file.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );
    return res.status(200).send(file.body);
  } catch (error) {
    logError("export.download", error);
    return res.status(errorStatus(error)).json({ message: errorMessage(error) });
  }
};

export { downloadExport };
