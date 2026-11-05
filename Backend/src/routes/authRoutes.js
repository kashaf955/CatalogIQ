const { Router } = require("express");
const { AuthController } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const {
  loginAccountLimit,
  loginIpLimit,
  registerLimit,
  passwordResetLimit,
  tokenLinkLimit,
} = require("../middleware/rateLimit");

const router = Router();
const authController = new AuthController();


router.post("/register", registerLimit, authController.register);
router.post("/login", loginIpLimit, loginAccountLimit, authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);
router.get("/invite/:token", tokenLinkLimit, authController.getInvite);
router.post("/invite/:token/accept", tokenLinkLimit, authController.acceptInvite);
router.post("/forgot-password", passwordResetLimit, authController.forgotPassword);
router.post("/reset-password/:token", tokenLinkLimit, authController.resetPassword);


module.exports = router;
