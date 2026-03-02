const router = require("express").Router();
const { getDashboard, getUsers, verifyDoctor, rejectDoctor, suspendDoctor, approvePatient, rejectPatient, getAuditLogs, getAIAnalytics } = require("../controllers/admin.controller");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.put("/verify-doctor/:id", verifyDoctor);
router.put("/reject-doctor/:id", rejectDoctor);
router.put("/suspend-doctor/:id", suspendDoctor);
router.put("/approve-patient/:id", approvePatient);
router.put("/reject-patient/:id", rejectPatient);
router.get("/audit-logs", getAuditLogs);
router.get("/ai-analytics", getAIAnalytics);

module.exports = router;
