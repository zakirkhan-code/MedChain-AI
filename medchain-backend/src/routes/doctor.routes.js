const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const doctorController = require("../controllers/doctor.controller");

router.post("/apply", protect, authorize("doctor"), asyncHandler(doctorController.submitApplication));
router.post("/confirm-onchain", protect, authorize("doctor"), asyncHandler(doctorController.confirmOnChain));
router.get("/me", protect, authorize("doctor"), asyncHandler(doctorController.getMyProfile));
router.put("/profile", protect, authorize("doctor"), asyncHandler(doctorController.updateProfile));
router.get("/list", protect, asyncHandler(doctorController.listDoctors));
router.get("/stats", protect, authorize("doctor"), asyncHandler(doctorController.getDoctorStats));
router.get("/:id", protect, asyncHandler(doctorController.getDoctorById));
router.post("/:id/rate", protect, authorize("patient"), asyncHandler(doctorController.rateDoctor));

module.exports = router;