const { Router } = require("express");
const { TenantController, removeMembership } = require("../controllers/tenantController");
const { authenticate, authorize } = require("../middleware/auth");

const router = Router();
const tenantController = new TenantController();

const owner = authorize("owner");

router.use(authenticate);
router.get("/me/members", tenantController.listMembers);
router.get("/me/settings", tenantController.getSettings);
router.patch("/me/settings", owner, tenantController.updateSettings);
router.post("/me/members", owner, tenantController.addMembership);
router.post("/me/members/:memberId/invite-link", owner, tenantController.regenerateInvite);
router.delete("/me/members/:memberId", owner, removeMembership);
    
module.exports = router;
