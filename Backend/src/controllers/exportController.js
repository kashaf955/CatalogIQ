const { buildExport } = require("../services/exportService");
const { logError } = require("../utils/logger");

const downloadExport = async (req, res) => {
  try {
    const file = await buildExport({
      tenantId: req.tenant.id,
      sourceId: req.query.sourceId,
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
    return res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = { downloadExport };
