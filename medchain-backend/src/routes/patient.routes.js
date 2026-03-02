const router = require("express").Router();
const { submitRegistration, getMyProfile, updateEmergencyInfo, getPatientById, deactivateAccount } = require("../controllers/patient.controller");
const { protect, authorize } = require("../middleware/auth");

router.post("/register-onchain", protect, authorize("patient"), submitRegistration);
router.get("/me", protect, authorize("patient"), getMyProfile);
router.put("/emergency-info", protect, authorize("patient"), updateEmergencyInfo);
router.put("/deactivate", protect, authorize("patient"), deactivateAccount);
router.get("/:id", protect, getPatientById);

module.exports = router;
