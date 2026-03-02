const router = require("express").Router();
const { grantAccess, revokeAccess, requestAccess, approveRequest, rejectRequest, getMyPermissions, getAuditTrail } = require("../controllers/access.controller");
const { protect, authorize } = require("../middleware/auth");

router.post("/grant", protect, authorize("patient"), grantAccess);
router.post("/revoke", protect, authorize("patient"), revokeAccess);
router.post("/request", protect, authorize("doctor"), requestAccess);
router.post("/approve", protect, authorize("patient"), approveRequest);
router.post("/reject", protect, authorize("patient"), rejectRequest);
router.get("/permissions", protect, getMyPermissions);
router.get("/audit", protect, authorize("admin"), getAuditTrail);

module.exports = router;
