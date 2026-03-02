const mongoose = require("mongoose");

const aiInteractionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["symptom-check", "report-summary", "drug-interaction", "health-insight", "chat"], required: true },
  query: { type: String, required: true },
  response: { type: String, required: true },
  context: { type: mongoose.Schema.Types.Mixed },
  relatedRecord: { type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord" },
  tokensUsed: { type: Number, default: 0 },
  model: { type: String, default: "gpt-4" },
  rating: { type: Number, min: 1, max: 5 },
}, { timestamps: true });

aiInteractionSchema.index({ user: 1, createdAt: -1 });
aiInteractionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("AIInteraction", aiInteractionSchema);
