const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  cnic: { type: String,unique: true,sparse: true,trim: true,match: [/^\d{5}-\d{7}-\d{1}$/, "CNIC format: XXXXX-XXXXXXX-X"],},
  email: { type: String, unique: true,sparse: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  walletAddress: { type: String, unique: true, sparse: true, lowercase: true },
  role: { type: String, enum: ["patient", "doctor", "admin", "operator"], required: true },
  phone: { type: String, trim: true },
  avatar: { type: String },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  onChainStatus: { type: Number, default: 0 },
  profileHash: { type: String },
  encryptedDataURI: { type: String },
  bloodType: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""], default: "" },
  allergies: { type: String, default: "" },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String },
  },
  specialization: { type: String },
  licenseNumber: { type: String },
  credentials: { type: String },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  totalRecords: { type: Number, default: 0 },
  totalPatients: { type: Number, default: 0 },
  fcmToken: { type: String },
  lastLogin: { type: Date },
  txHashes: [{
      type: String,
    }],
    rejectionReason: String,
    suspensionReason: String,
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
