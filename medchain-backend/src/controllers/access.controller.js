const AccessLog = require("../models/AccessLog");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { grantAccessOnChain, revokeAccessOnChain, requestAccessOnChain, approveAccessRequestOnChain, rejectAccessRequestOnChain, grantEmergencyAccessOnChain, checkAccessOnChain } = require("../services/blockchain.service");
const { createNotification } = require("../services/notification.service");

exports.grantAccess = asyncHandler(async (req, res) => {
  const { doctorId, accessLevel, duration, allowedRecordTypes, purpose } = req.body;

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "doctor") return res.status(404).json({ success: false, message: "Doctor not found" });

  const levelMap = { ReadOnly: 1, ReadWrite: 2 };
  const level = levelMap[accessLevel] || 1;

  let txResult = null;
  if (req.user.walletAddress && doctor.walletAddress) {
    try {
      txResult = await grantAccessOnChain(doctor.walletAddress, level, duration, allowedRecordTypes || [], purpose || "");
    } catch (e) { console.error("On-chain grant failed:", e.message); }
  }

  const log = await AccessLog.create({
    patient: req.user._id, provider: doctorId, action: "granted",
    accessLevel, allowedRecordTypes, purpose, duration,
    expiresAt: new Date(Date.now() + duration * 1000),
    txHash: txResult?.txHash,
  });

  await createNotification(doctorId, "access_granted", "Access Granted", `${req.user.name} granted you ${accessLevel} access`, { patientId: req.user._id });

  res.json({ success: true, data: { log, tx: txResult } });
});

exports.revokeAccess = asyncHandler(async (req, res) => {
  const { doctorId } = req.body;
  const doctor = await User.findById(doctorId);

  let txResult = null;
  if (req.user.walletAddress && doctor?.walletAddress) {
    try { txResult = await revokeAccessOnChain(doctor.walletAddress); } catch (e) {}
  }

  const log = await AccessLog.create({
    patient: req.user._id, provider: doctorId, action: "revoked", txHash: txResult?.txHash,
  });

  await createNotification(doctorId, "access_revoked", "Access Revoked", `${req.user.name} revoked your access`);

  res.json({ success: true, data: { log, tx: txResult } });
});

exports.requestAccess = asyncHandler(async (req, res) => {
  const { patientId, accessLevel, requestedTypes, reason, duration } = req.body;
  const patient = await User.findById(patientId);
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

  const levelMap = { ReadOnly: 1, ReadWrite: 2 };

  let txResult = null;
  if (req.user.walletAddress && patient.walletAddress) {
    try {
      txResult = await requestAccessOnChain(patient.walletAddress, levelMap[accessLevel] || 1, requestedTypes || [], reason, duration);
    } catch (e) {}
  }

  const log = await AccessLog.create({
    patient: patientId, provider: req.user._id, action: "requested",
    accessLevel, allowedRecordTypes: requestedTypes, purpose: reason, duration,
    txHash: txResult?.txHash,
  });

  await createNotification(patientId, "access_request", "Access Request", `Dr. ${req.user.name} is requesting access to your records`, { doctorId: req.user._id, reason });

  res.json({ success: true, data: { log, tx: txResult } });
});

exports.approveRequest = asyncHandler(async (req, res) => {
  const { requestId, onChainRequestId } = req.body;

  let txResult = null;
  if (onChainRequestId) {
    try { txResult = await approveAccessRequestOnChain(onChainRequestId); } catch (e) {}
  }

  const log = await AccessLog.findByIdAndUpdate(requestId, { action: "approved", txHash: txResult?.txHash }, { new: true });

  res.json({ success: true, data: { log, tx: txResult } });
});

exports.rejectRequest = asyncHandler(async (req, res) => {
  const { requestId, onChainRequestId } = req.body;

  let txResult = null;
  if (onChainRequestId) {
    try { txResult = await rejectAccessRequestOnChain(onChainRequestId); } catch (e) {}
  }

  const log = await AccessLog.findByIdAndUpdate(requestId, { action: "rejected", txHash: txResult?.txHash }, { new: true });

  res.json({ success: true, data: { log, tx: txResult } });
});

exports.getMyPermissions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const filter = req.user.role === "patient" ? { patient: req.user._id } : { provider: req.user._id };

  const logs = await AccessLog.find(filter)
    .populate("patient", "name email").populate("provider", "name email specialization")
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  const total = await AccessLog.countDocuments(filter);

  res.json({ success: true, data: { logs, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

exports.getAuditTrail = asyncHandler(async (req, res) => {
  const { patientId, providerId, action, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (patientId) filter.patient = patientId;
  if (providerId) filter.provider = providerId;
  if (action) filter.action = action;

  const logs = await AccessLog.find(filter)
    .populate("patient", "name").populate("provider", "name")
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  const total = await AccessLog.countDocuments(filter);

  res.json({ success: true, data: { logs, total, page: Number(page), pages: Math.ceil(total / limit) } });
});
