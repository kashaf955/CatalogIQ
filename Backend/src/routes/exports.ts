import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { buildUpdateCsv } from "../services/exportService";

const router = Router();

router.get(
  "/update-csv",
  asyncHandler(async (req, res) => {
    const { manufacturer, brand } = req.query as Record<string, string | undefined>;
    const csv = await buildUpdateCsv({ manufacturer, brand });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="catalogiq-updates.csv"');
    res.send(csv);
  })
);

export default router;
