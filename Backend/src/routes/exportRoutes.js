const { Router } = require("express");
const { downloadExport } = require("../controllers/exportController");
const { authenticate } = require("../middleware/auth");

const router = Router();
router.use(authenticate);
router.get("/", downloadExport);

module.exports = router;
