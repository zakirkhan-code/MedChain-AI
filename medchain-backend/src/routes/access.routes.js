const router = require("express").Router();
const { grantAccess, revokeAccess, requestAccess, approveRequest, rejectRequest, getMyPermissions, getAuditTrail } = require("../controllers/access.controller");
const { protect, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const AccessLog = require("../models/AccessLog");
const User = require("../models/User");

router.post("/grant", protect, authorize("patient"), grantAccess);
router.post("/revoke", protect, authorize("patient"), revokeAccess);
router.post("/request", protect, authorize("doctor"), requestAccess);
router.post("/approve", protect, authorize("patient"), approveRequest);
router.post("/reject", protect, authorize("patient"), rejectRequest);
router.get("/permissions", protect, getMyPermissions);
router.get("/audit", protect, authorize("admin"), getAuditTrail);

// Doctor: Get my patients (who granted me access)
router.get("/my-patients", protect, authorize("doctor"), asyncHandler(async (req, res) => {
  const logs = await AccessLog.find({
    provider: req.user._id,
    action: "granted",
  })
    .populate("patient", "name email cnic phone walletAddress bloodType allergies")
    .sort({ createdAt: -1 });

  // Get unique patients
  const patientMap = {};
  logs.forEach(log => {
    if (log.patient && !patientMap[log.patient._id.toString()]) {
      patientMap[log.patient._id.toString()] = {
        ...log.patient.toObject(),
        grantedAt: log.createdAt,
        accessLevel: log.accessLevel,
        purpose: log.purpose,
        txHash: log.txHash,
      };
    }
  });

  const patients = Object.values(patientMap);

  res.json({
    success: true,
    data: { patients, total: patients.length },
  });
}));

module.exports = router;