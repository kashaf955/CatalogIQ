const { Router } = require("express");
const {
  runMatches,
  getMatches,
  getCompare,
  updateComparePrices,
  updateMatch,
} = require("../controllers/matchController");
const { authenticate, authorize } = require("../middleware/auth");

const router = Router();
router.use(authenticate);
const manage = authorize("owner", "admin", "manager");
router.get("/", getMatches);
router.get("/compare", getCompare);
router.post("/run", manage, runMatches);
router.post("/compare/prices", manage, updateComparePrices);
router.patch(
  "/:id",
  authorize("owner", "admin", "manager", "reviewer"),
  updateMatch
);

module.exports = router;
