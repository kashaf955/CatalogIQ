import { Router } from "express";
import {
  runMatches,
  getMatches,
  getCompare,
  updateComparePrices,
  updateMatch,
  runAiCheck,
  getAiCheck,
} from "../controllers/matchController";
import { authenticate, authorize } from "../middleware/auth";

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

export default router;
