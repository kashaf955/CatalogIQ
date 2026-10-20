const { Router } = require("express");
const {
  getProducts,
  deleteProduct,
  deleteProductsBulk,
} = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/auth");

const router = Router();
router.use(authenticate);
router.get("/", getProducts);
router.delete("/", authorize("owner", "admin"), deleteProductsBulk);
router.delete("/:id", authorize("owner", "admin"), deleteProduct);

module.exports = router;
