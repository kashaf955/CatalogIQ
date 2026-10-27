const { Router } = require("express");
const {
  getProducts,
  getProduct,
  deleteProduct,
  deleteProductsBulk,
} = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/auth");

const router = Router();
router.use(authenticate);
const manage = authorize("owner", "admin", "manager");
router.get("/", getProducts);
router.get("/:id", getProduct);
router.delete("/", manage, deleteProductsBulk);
router.delete("/:id", manage, deleteProduct);

module.exports = router;
