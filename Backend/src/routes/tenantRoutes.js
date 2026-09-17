const { Router } = require("express");
const { TenantController, removeMembership } = require("../controllers/tenantController");
const { authenticate, authorize } = require("../middleware/auth");

const router = Router();
const tenantController = new TenantController();

router.use(authenticate);
router.get("/me/members", tenantController.listMembers);
router.post("/me/members", authorize("owner", "admin"), tenantController.addMembership);
router.delete("/me/members/:memberId", authorize("owner", "admin"), removeMembership);
    
module.exports = router;
