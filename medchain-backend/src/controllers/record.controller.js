const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { uploadEncryptedRecord, fetchFromIPFS } = require("../services/ipfs.service");
const { hashData, createRecordOnChain, amendRecordOnChain, verifyRecordOnChain } = require("../services/blockchain.service");
const { RECORD_TYPES } = require("../config/constants");

exports.createRecord = asyncHandler(async (req, res) => {
  const { title, description, recordType, patientId, data, tags } = req.body;

  const patient = patientId ? await User.findById(patientId) : req.user;
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

  const recordData = { title, description, data, uploadedBy: req.user._id, timestamp: Date.now() };
  const contentHash = hashData(recordData);

  const ipfsResult = await uploadEncryptedRecord(recordData, { name: title, type: recordType });

  const typeIndex = RECORD_TYPES[recordType.toUpperCase().replace(" ", "_")] || 7;

  let txResult = null;
  if (patient.walletAddress) {
    try {
      txResult = await createRecordOnChain(
        patient.walletAddress, contentHash, ipfsResult.ipfsURI,
        ipfsResult.encryptionKeyHash, typeIndex, description
      );
    } catch (e) { console.error("On-chain record failed:", e.message); }
  }

  const record = await MedicalRecord.create({
    patient: patient._id,
    uploadedBy: req.user._id,
    title, description, recordType,
    contentHash, ipfsURI: ipfsResult.ipfsURI,
    encryptionKeyHash: ipfsResult.encryptionKeyHash,
    fileSize: ipfsResult.size,
    tags: tags || [],
    txHash: txResult?.txHash,
    blockNumber: txResult?.blockNumber,
  });

  patient.totalRecords = (patient.totalRecords || 0) + 1;
  await patient.save();

  res.status(201).json({ success: true, data: { record, ipfs: ipfsResult, tx: txResult } });
});

exports.getRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id)
    .populate("patient", "name email walletAddress")
    .populate("uploadedBy", "name email role");

  if (!record) return res.status(404).json({ success: false, message: "Record not found" });

  const isOwner = record.patient._id.toString() === req.user._id.toString();
  const isUploader = record.uploadedBy._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isUploader && !isAdmin) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  res.json({ success: true, data: record });
});

exports.getPatientRecords = asyncHandler(async (req, res) => {
  const { recordType, status, page = 1, limit = 20 } = req.query;
  const patientId = req.params.patientId || req.user._id;

  const filter = { patient: patientId };
  if (recordType) filter.recordType = recordType;
  if (status) filter.status = status;

  const records = await MedicalRecord.find(filter)
    .populate("uploadedBy", "name role")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit).limit(Number(limit));

  const total = await MedicalRecord.countDocuments(filter);

  res.json({ success: true, data: { records, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

exports.amendRecord = asyncHandler(async (req, res) => {
  const { reason, data } = req.body;
  const record = await MedicalRecord.findById(req.params.id);

  if (!record) return res.status(404).json({ success: false, message: "Record not found" });
  if (record.patient.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Only patient or admin can amend" });
  }

  const newData = { ...data, amendedBy: req.user._id, timestamp: Date.now() };
  const newHash = hashData(newData);
  const ipfsResult = await uploadEncryptedRecord(newData, { name: `amended-${record.title}` });

  let txResult = null;
  if (record.onChainId) {
    try { txResult = await amendRecordOnChain(record.onChainId, newHash, ipfsResult.ipfsURI, reason); } catch (e) {}
  }

  record.amendments.push({
    oldHash: record.contentHash, newHash, reason,
    amendedBy: req.user._id, version: record.version,
  });
  record.contentHash = newHash;
  record.ipfsURI = ipfsResult.ipfsURI;
  record.status = "Amended";
  record.version += 1;
  await record.save();

  res.json({ success: true, data: { record, tx: txResult } });
});

exports.archiveRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: "Record not found" });
  if (record.patient.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Only patient or admin" });
  }

  record.status = "Archived";
  await record.save();
  res.json({ success: true, data: record, message: "Record archived" });
});

exports.verifyRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: "Record not found" });

  let onChainValid = null;
  if (record.onChainId) {
    try { onChainValid = await verifyRecordOnChain(record.onChainId, record.contentHash); } catch (e) {}
  }

  res.json({
    success: true,
    data: { recordId: record._id, contentHash: record.contentHash, onChainVerified: onChainValid, status: record.status, version: record.version },
  });
});
