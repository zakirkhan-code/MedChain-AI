const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { uploadToIPFS } = require("../services/ipfs.service");
const { hashData, submitDoctorApplication } = require("../services/blockchain.service");
const { VALID_SPECIALIZATIONS } = require("../config/constants");

exports.submitApplication = asyncHandler(async (req, res) => {
  const { specialization, licenseNumber, credentials } = req.body;
  const user = req.user;

  if (!user.walletAddress) return res.status(400).json({ success: false, message: "Connect wallet first" });
  if (!VALID_SPECIALIZATIONS.includes(specialization)) {
    return res.status(400).json({ success: false, message: "Invalid specialization" });
  }

  const credData = { name: user.name, license: licenseNumber, specialization, credentials };
  const credHash = hashData(credData);

  const profileIPFS = await uploadToIPFS({ ...credData, email: user.email }, { name: `doctor-${user._id}` });
  const docIPFS = await uploadToIPFS({ credentials, licenseNumber }, { name: `doctor-creds-${user._id}` });

  const txResult = await submitDoctorApplication(credHash, profileIPFS.ipfsURI, specialization, licenseNumber, docIPFS.ipfsURI);

  user.specialization = specialization;
  user.licenseNumber = licenseNumber;
  user.credentials = credentials;
  user.profileHash = credHash;
  user.encryptedDataURI = profileIPFS.ipfsURI;
  user.onChainStatus = 1;
  user.txHashes.push(txResult.txHash);
  await user.save();

  res.json({ success: true, data: { user, tx: txResult }, message: "Application submitted on-chain" });
});

exports.getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { specialization, encryptedDataURI } = req.body;
  if (specialization && !VALID_SPECIALIZATIONS.includes(specialization)) {
    return res.status(400).json({ success: false, message: "Invalid specialization" });
  }
  const updates = {};
  if (specialization) updates.specialization = specialization;
  if (encryptedDataURI) updates.encryptedDataURI = encryptedDataURI;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json({ success: true, data: user });
});

exports.getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await User.findById(req.params.id).select("name specialization rating ratingCount avatar isVerified");
  if (!doctor || doctor.role !== "doctor") {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }
  res.json({ success: true, data: doctor });
});

exports.listDoctors = asyncHandler(async (req, res) => {
  const { specialization, page = 1, limit = 20 } = req.query;
  const filter = { role: "doctor", isVerified: true, isActive: true };
  if (specialization) filter.specialization = specialization;

  const doctors = await User.find(filter)
    .select("name specialization rating ratingCount avatar totalPatients")
    .skip((page - 1) * limit).limit(Number(limit));
  const total = await User.countDocuments(filter);

  res.json({ success: true, data: { doctors, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

exports.rateDoctor = asyncHandler(async (req, res) => {
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be 1-5" });
  }

  const doctor = await User.findById(req.params.id);
  if (!doctor || doctor.role !== "doctor") {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }

  const newTotal = doctor.rating * doctor.ratingCount + rating;
  doctor.ratingCount += 1;
  doctor.rating = newTotal / doctor.ratingCount;
  await doctor.save();

  res.json({ success: true, data: { rating: doctor.rating, count: doctor.ratingCount } });
});
