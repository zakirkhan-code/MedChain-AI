const router = require("express").Router();
const { createRecord, getRecord, getPatientRecords, amendRecord, archiveRecord, verifyRecord } = require("../controllers/record.controller");
const { protect, authorize } = require("../middleware/auth");

router.post("/", protect, authorize("patient", "doctor", "admin"), createRecord);
router.get("/my-records", protect, authorize("patient"), getPatientRecords);
router.get("/patient/:patientId", protect, authorize("doctor", "admin"), getPatientRecords);
router.get("/:id", protect, getRecord);
router.put("/:id/amend", protect, authorize("patient", "admin"), amendRecord);
router.put("/:id/archive", protect, authorize("patient", "admin"), archiveRecord);
router.get("/:id/verify", protect, verifyRecord);

module.exports = router;
