const router = require("express").Router();
const { submitApplication, getMyProfile, updateProfile, getDoctorById, listDoctors, rateDoctor } = require("../controllers/doctor.controller");
const { protect, authorize } = require("../middleware/auth");

router.post("/apply", protect, authorize("doctor"), submitApplication);
router.get("/me", protect, authorize("doctor"), getMyProfile);
router.put("/profile", protect, authorize("doctor"), updateProfile);
router.get("/list", protect, listDoctors);
router.get("/:id", protect, getDoctorById);
router.post("/:id/rate", protect, authorize("patient"), rateDoctor);

module.exports = router;
