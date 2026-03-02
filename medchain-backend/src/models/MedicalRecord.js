const mongoose = require("mongoose");

const amendmentSchema = new mongoose.Schema({
  oldHash: String,
  newHash: String,
  reason: String,
  amendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  version: Number,
}, { timestamps: true });

const recordSchema = new mongoose.Schema({
  onChainId: { type: Number, unique: true, sparse: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  recordType: {
    type: String,
    enum: ["LabReport", "Prescription", "Imaging", "Diagnosis", "Vaccination", "Surgery", "Discharge", "Other"],
    required: true,
  },
  contentHash: { type: String, required: true },
  ipfsURI: { type: String },
  encryptionKeyHash: { type: String },
  fileSize: { type: Number },
  fileFormat: { type: String },
  status: { type: String, enum: ["Active", "Amended", "Archived"], default: "Active" },
  version: { type: Number, default: 1 },
  amendments: [amendmentSchema],
  txHash: { type: String },
  blockNumber: { type: Number },
  tags: [{ type: String }],
  aiSummary: { type: String },
  aiAnalysis: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

recordSchema.index({ patient: 1, recordType: 1 });
recordSchema.index({ contentHash: 1 }, { unique: true });
recordSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model("MedicalRecord", recordSchema);
