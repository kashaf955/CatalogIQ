const { Router } = require("express");
const {
  runMatches,
  getMatches,
  updateMatch,
} = require("../controllers/matchController");
const { authenticate } = require("../middleware/auth");

const router = Router();
router.use(authenticate);
router.get("/", getMatches);
router.post("/run", runMatches);
router.patch("/:id", updateMatch);

module.exports = router;
