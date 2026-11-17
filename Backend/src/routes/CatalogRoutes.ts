import { Router } from "express";
import catalogController from "../controllers/catalogController";
import { authenticate, authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();
router.use(authenticate);

const manage = authorize("owner", "manager");

router.get("/", catalogController.getCatalog);
router.get("/:id", catalogController.getCatalogById);
router.post("/", manage, catalogController.createCatalog);
router.post("/:id/ingest/abort", manage, catalogController.abortIngest);
router.post(
  "/:id/ingest",
  manage,
  upload.single("file"),
  catalogController.ingestCatalog
);
router.put("/:id", manage, catalogController.updateCatalog);
router.delete("/:id", manage, catalogController.deleteCatalog);

export default router;
