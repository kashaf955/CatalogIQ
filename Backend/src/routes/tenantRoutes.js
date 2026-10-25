const { Router } = require("express");
const { TenantController, removeMembership } = require("../controllers/tenantController");
const { authenticate, authorize } = require("../middleware/auth");

const router = Router();
const tenantController = new TenantController();

router.use(authenticate);
router.get("/me/members", tenantController.listMembers);
router.get("/me/settings", tenantController.getSettings);
router.patch("/me/settings", authorize("owner", "admin"), tenantController.updateSettings);
router.post("/me/members", authorize("owner", "admin"), tenantController.addMembership);
router.delete("/me/members/:memberId", authorize("owner", "admin"), removeMembership);
    
module.exports = router;
