const { Router } = require("express");
const { getProducts } = require("../controllers/productController");
const { authenticate } = require("../middleware/auth");

const router = Router();
router.use(authenticate);
router.get("/", getProducts);

module.exports = router;
