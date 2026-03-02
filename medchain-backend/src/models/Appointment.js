const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dateTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: ["pending", "confirmed", "cancelled", "completed", "no-show"], default: "pending" },
  type: { type: String, enum: ["in-person", "video", "phone"], default: "in-person" },
  reason: { type: String, required: true },
  notes: { type: String },
  doctorNotes: { type: String },
  prescription: { type: String },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  cancelReason: { type: String },
}, { timestamps: true });

appointmentSchema.index({ patient: 1, dateTime: -1 });
appointmentSchema.index({ doctor: 1, dateTime: -1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
