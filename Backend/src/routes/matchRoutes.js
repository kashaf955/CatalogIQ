const { Router } = require("express");
const {
  runMatches,
  getMatches,
  updateMatch,
} = require("../controllers/matchController");
const { authenticate, authorize } = require("../middleware/auth");

const router = Router();
router.use(authenticate);
router.get("/", getMatches);
router.post("/run", authorize("owner", "admin", "manager"), runMatches);
router.patch(
  "/:id",
  authorize("owner", "admin", "manager", "reviewer"),
  updateMatch
);

module.exports = router;
