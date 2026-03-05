const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const adminController = require("../controllers/admin.controller");

router.get("/dashboard", protect, authorize("admin"), asyncHandler(adminController.getDashboard));
router.get("/users", protect, authorize("admin"), asyncHandler(adminController.getUsers));
router.get("/pending-doctors", protect, authorize("admin"), asyncHandler(adminController.getPendingDoctors));
router.get("/pending-patients", protect, authorize("admin"), asyncHandler(adminController.getPendingPatients));
router.get("/patient/:id", protect, authorize("admin"), asyncHandler(adminController.getPatientById));
router.put("/verify-doctor/:id", protect, authorize("admin"), asyncHandler(adminController.verifyDoctor));
router.put("/reject-doctor/:id", protect, authorize("admin"), asyncHandler(adminController.rejectDoctor));
router.put("/suspend-doctor/:id", protect, authorize("admin"), asyncHandler(adminController.suspendDoctor));
router.put("/approve-patient/:id", protect, authorize("admin"), asyncHandler(adminController.approvePatient));
router.put("/reject-patient/:id", protect, authorize("admin"), asyncHandler(adminController.rejectPatient));
router.get("/audit", protect, authorize("admin"), asyncHandler(adminController.getAuditLogs));
router.get("/ai-analytics", protect, authorize("admin"), asyncHandler(adminController.getAIAnalytics));
router.get("/chain-stats", protect, authorize("admin"), asyncHandler(adminController.getChainStats));

module.exports = router;