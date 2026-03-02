const User = require("../models/User");
const MedicalRecord = require("../models/MedicalRecord");
const AccessLog = require("../models/AccessLog");
const AIInteraction = require("../models/AIInteraction");
const Appointment = require("../models/Appointment");
const { asyncHandler } = require("../middleware/errorHandler");
const { verifyDoctorOnChain, rejectDoctorOnChain, suspendDoctorOnChain, approvePatientOnChain, rejectPatientOnChain, getPlatformStats } = require("../services/blockchain.service");
const { createNotification } = require("../services/notification.service");

exports.getDashboard = asyncHandler(async (req, res) => {
  const [totalUsers, totalPatients, totalDoctors, totalRecords, totalAccess, totalAI, pendingDoctors, pendingPatients] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "patient" }),
    User.countDocuments({ role: "doctor" }),
    MedicalRecord.countDocuments(),
    AccessLog.countDocuments(),
    AIInteraction.countDocuments(),
    User.countDocuments({ role: "doctor", onChainStatus: 1 }),
    User.countDocuments({ role: "patient", onChainStatus: 1 }),
  ]);

  let onChainStats = null;
  try { onChainStats = await getPlatformStats(); } catch (e) {}

  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt");
  const recentRecords = await MedicalRecord.find().sort({ createdAt: -1 }).limit(5).populate("patient", "name");

  res.json({
    success: true,
    data: {
      stats: { totalUsers, totalPatients, totalDoctors, totalRecords, totalAccess, totalAI, pendingDoctors, pendingPatients },
      onChainStats, recentUsers, recentRecords,
    },
  });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const { role, search, isActive, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];

  const users = await User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  const total = await User.countDocuments(filter);

  res.json({ success: true, data: { users, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

exports.verifyDoctor = asyncHandler(async (req, res) => {
  const doctor = await User.findById(req.params.id);
  if (!doctor || doctor.role !== "doctor") return res.status(404).json({ success: false, message: "Doctor not found" });

  let txResult = null;
  if (doctor.walletAddress) {
    try { txResult = await verifyDoctorOnChain(doctor.walletAddress); } catch (e) { console.error("On-chain verify failed:", e.message); }
  }

  doctor.isVerified = true;
  doctor.verifiedBy = req.user._id;
  doctor.verifiedAt = new Date();
  doctor.onChainStatus = 2;
  if (txResult) doctor.txHashes.push(txResult.txHash);
  await doctor.save();

  await createNotification(doctor._id, "verification", "Verified!", "Your credentials have been verified. You now have full platform access.");

  res.json({ success: true, data: { doctor, tx: txResult }, message: "Doctor verified" });
});

exports.rejectDoctor = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const doctor = await User.findById(req.params.id);
  if (!doctor || doctor.role !== "doctor") return res.status(404).json({ success: false, message: "Doctor not found" });

  let txResult = null;
  if (doctor.walletAddress) {
    try { txResult = await rejectDoctorOnChain(doctor.walletAddress, reason); } catch (e) {}
  }

  doctor.onChainStatus = 3;
  if (txResult) doctor.txHashes.push(txResult.txHash);
  await doctor.save();

  await createNotification(doctor._id, "verification", "Verification Rejected", `Reason: ${reason}`);

  res.json({ success: true, data: { doctor, tx: txResult } });
});

exports.suspendDoctor = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const doctor = await User.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

  let txResult = null;
  if (doctor.walletAddress) {
    try { txResult = await suspendDoctorOnChain(doctor.walletAddress, reason); } catch (e) {}
  }

  doctor.isActive = false;
  doctor.onChainStatus = 4;
  await doctor.save();

  res.json({ success: true, data: { doctor, tx: txResult }, message: "Doctor suspended" });
});

exports.approvePatient = asyncHandler(async (req, res) => {
  const patient = await User.findById(req.params.id);
  if (!patient || patient.role !== "patient") return res.status(404).json({ success: false, message: "Patient not found" });

  let txResult = null;
  if (patient.walletAddress) {
    try { txResult = await approvePatientOnChain(patient.walletAddress); } catch (e) {}
  }

  patient.onChainStatus = 2;
  if (txResult) patient.txHashes.push(txResult.txHash);
  await patient.save();

  await createNotification(patient._id, "verification", "Registration Approved", "Please give consent to activate your account.");

  res.json({ success: true, data: { patient, tx: txResult } });
});

exports.rejectPatient = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const patient = await User.findById(req.params.id);
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

  let txResult = null;
  if (patient.walletAddress) {
    try { txResult = await rejectPatientOnChain(patient.walletAddress, reason); } catch (e) {}
  }

  patient.onChainStatus = 3;
  await patient.save();

  res.json({ success: true, data: { patient, tx: txResult } });
});

exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const logs = await AccessLog.find()
    .populate("patient", "name").populate("provider", "name")
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  const total = await AccessLog.countDocuments();

  res.json({ success: true, data: { logs, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

exports.getAIAnalytics = asyncHandler(async (req, res) => {
  const [totalInteractions, byType, totalTokens] = await Promise.all([
    AIInteraction.countDocuments(),
    AIInteraction.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
    AIInteraction.aggregate([{ $group: { _id: null, total: { $sum: "$tokensUsed" } } }]),
  ]);

  res.json({
    success: true,
    data: { totalInteractions, byType, totalTokensUsed: totalTokens[0]?.total || 0 },
  });
});
