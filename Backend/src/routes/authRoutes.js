const { Router } = require("express");
const { AuthController } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

module.exports = router;
