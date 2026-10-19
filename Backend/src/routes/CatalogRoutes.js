const { Router } = require("express");
const catalogController = require("../controllers/catalogController");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = Router();
router.use(authenticate);

router.get("/", catalogController.getCatalog);
router.get("/:id", catalogController.getCatalogById);
router.post("/", catalogController.createCatalog);
router.post("/:id/ingest", upload.single("file"), catalogController.ingestCatalog);
router.put("/:id", catalogController.updateCatalog);
router.delete("/:id", catalogController.deleteCatalog);

module.exports = router;