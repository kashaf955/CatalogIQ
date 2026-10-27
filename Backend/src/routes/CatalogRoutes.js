const { Router } = require("express");
const catalogController = require("../controllers/catalogController");
const { authenticate, authorize } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = Router();
router.use(authenticate);

const manage = authorize("owner", "admin", "manager");

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

module.exports = router;