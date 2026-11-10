const { Router } = require("express");
const {
  runMatches,
  getMatches,
  getCompare,
  updateComparePrices,
  updateMatch,
  runAiCheck,
  getAiCheck,
} = require("../controllers/matchController");
const { authenticate, authorize } = require("../middleware/auth");

const router = Router();
router.use(authenticate);
const manage = authorize("owner", "manager");
router.get("/", getMatches);
router.get("/compare", getCompare);
router.post("/run", manage, runMatches);
router.get("/ai-check", getAiCheck);
router.post("/ai-check", manage, runAiCheck);
router.post("/compare/prices", manage, updateComparePrices);
router.patch("/:id", manage, updateMatch);

module.exports = router;
