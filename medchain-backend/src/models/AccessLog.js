const mongoose = require("mongoose");

const accessLogSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    enum: ["granted", "revoked", "expired", "emergency", "requested", "approved", "rejected", "cancelled"],
    required: true,
  },
  accessLevel: { type: String, enum: ["None", "ReadOnly", "ReadWrite", "Emergency"] },
  allowedRecordTypes: [{ type: String }],
  purpose: { type: String },
  duration: { type: Number },
  expiresAt: { type: Date },
  onChainRequestId: { type: Number },
  txHash: { type: String },
  onChainConsentId: { type: Number },
}, { timestamps: true });

accessLogSchema.index({ patient: 1, createdAt: -1 });
accessLogSchema.index({ provider: 1, createdAt: -1 });
accessLogSchema.index({ patient: 1, provider: 1 });

module.exports = mongoose.model("AccessLog", accessLogSchema);
