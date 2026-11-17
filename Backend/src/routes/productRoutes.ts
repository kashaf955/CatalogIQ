import { Router } from "express";
import {
  getProducts,
  getProduct,
  deleteProduct,
  deleteProductsBulk,
} from "../controllers/productController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);
const manage = authorize("owner", "manager");
router.get("/", getProducts);
router.get("/:id", getProduct);
router.delete("/", manage, deleteProductsBulk);
router.delete("/:id", manage, deleteProduct);

export default router;
