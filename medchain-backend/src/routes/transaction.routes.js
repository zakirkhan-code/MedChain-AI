const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { verifyTransaction } = require("../services/txVerify.service");
const User = require("../models/User");
const MedicalRecord = require("../models/MedicalRecord");
const AccessLog = require("../models/AccessLog");

// Patient submits on-chain registration tx
router.post("/patient-registration", protect, authorize("patient"), asyncHandler(async (req, res) => {
  const { txHash } = req.body;
  if (!txHash) return res.status(400).json({ success: false, message: "txHash is required" });

  const txData = await verifyTransaction(txHash, req.user.walletAddress, process.env.PATIENT_REGISTRY_ADDRESS);

  await User.findByIdAndUpdate(req.user._id, {
    onChainStatus: 1,
    $push: { txHashes: txHash },
  });

  res.json({ success: true, data: { tx: txData }, message: "Patient registration tx verified" });
}));

// Doctor submits application tx
router.post("/doctor-application", protect, authorize("doctor"), asyncHandler(async (req, res) => {
  const { txHash } = req.body;
  if (!txHash) return res.status(400).json({ success: false, message: "txHash is required" });

  const txData = await verifyTransaction(txHash, req.user.walletAddress, process.env.DOCTOR_REGISTRY_ADDRESS);

  await User.findByIdAndUpdate(req.user._id, {
    onChainStatus: 1,
    $push: { txHashes: txHash },
  });

  res.json({ success: true, data: { tx: txData }, message: "Doctor application tx verified" });
}));

// Admin submits verify doctor tx
router.post("/verify-doctor", protect, authorize("admin"), asyncHandler(async (req, res) => {
  const { txHash, doctorId } = req.body;
  if (!txHash || !doctorId) return res.status(400).json({ success: false, message: "txHash and doctorId required" });

  const txData = await verifyTransaction(txHash, req.user.walletAddress, process.env.DOCTOR_REGISTRY_ADDRESS);

  await User.findByIdAndUpdate(doctorId, {
    isVerified: true,
    verifiedBy: req.user._id,
    verifiedAt: new Date(),
    onChainStatus: 2,
    $push: { txHashes: txHash },
  });

  res.json({ success: true, data: { tx: txData }, message: "Doctor verified on-chain" });
}));

// Admin submits approve patient tx
router.post("/approve-patient", protect, authorize("admin"), asyncHandler(async (req, res) => {
  const { txHash, patientId } = req.body;
  if (!txHash || !patientId) return res.status(400).json({ success: false, message: "txHash and patientId required" });

  const txData = await verifyTransaction(txHash, req.user.walletAddress, process.env.PATIENT_REGISTRY_ADDRESS);

  await User.findByIdAndUpdate(patientId, {
    onChainStatus: 2,
    $push: { txHashes: txHash },
  });

  res.json({ success: true, data: { tx: txData }, message: "Patient approved on-chain" });
}));

// User submits create record tx
router.post("/create-record", protect, asyncHandler(async (req, res) => {
  const { txHash, recordData } = req.body;
  if (!txHash) return res.status(400).json({ success: false, message: "txHash is required" });

  const txData = await verifyTransaction(txHash, req.user.walletAddress, process.env.RECORD_MANAGER_ADDRESS);

  const record = await MedicalRecord.create({
    ...recordData,
    patient: recordData.patientId || req.user._id,
    uploadedBy: req.user._id,
    txHash: txHash,
    blockNumber: txData.blockNumber,
  });

  res.json({ success: true, data: { record, tx: txData }, message: "Record tx verified and saved" });
}));

// Patient submits grant access tx
router.post("/grant-access", protect, authorize("patient"), asyncHandler(async (req, res) => {
  const { txHash, doctorId, accessLevel, purpose, duration } = req.body;
  if (!txHash || !doctorId) return res.status(400).json({ success: false, message: "txHash and doctorId required" });

  const txData = await verifyTransaction(txHash, req.user.walletAddress, process.env.ACCESS_CONTROL_ADDRESS);

  const log = await AccessLog.create({
    patient: req.user._id,
    provider: doctorId,
    action: "granted",
    accessLevel,
    purpose,
    duration,
    txHash,
  });

  res.json({ success: true, data: { log, tx: txData }, message: "Access grant tx verified" });
}));

// Patient submits revoke access tx
router.post("/revoke-access", protect, authorize("patient"), asyncHandler(async (req, res) => {
  const { txHash, doctorId } = req.body;
  if (!txHash || !doctorId) return res.status(400).json({ success: false, message: "txHash and doctorId required" });

  const txData = await verifyTransaction(txHash, req.user.walletAddress, process.env.ACCESS_CONTROL_ADDRESS);

  const log = await AccessLog.create({
    patient: req.user._id,
    provider: doctorId,
    action: "revoked",
    txHash,
  });

  res.json({ success: true, data: { log, tx: txData }, message: "Access revoke tx verified" });
}));

module.exports = router;