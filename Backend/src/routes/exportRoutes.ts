import { Router } from "express";
import { downloadExport } from "../controllers/exportController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/", downloadExport);

export default router;
