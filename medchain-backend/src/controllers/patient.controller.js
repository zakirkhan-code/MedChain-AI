const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { uploadToIPFS } = require("../services/ipfs.service");
const { hashData, submitPatientRegistration, getPatientStatusOnChain } = require("../services/blockchain.service");
const { createNotification } = require("../services/notification.service");

exports.submitRegistration = asyncHandler(async (req, res) => {
  const { bloodType, allergies } = req.body;
  const user = req.user;

  if (!user.walletAddress) return res.status(400).json({ success: false, message: "Connect wallet first" });

  const profileData = { name: user.name, email: user.email, phone: user.phone };
  const profileHash = hashData(profileData);

  const ipfsResult = await uploadToIPFS({ ...profileData, bloodType, allergies }, { name: `patient-${user._id}` });

  const txResult = await submitPatientRegistration(
    user.walletAddress, profileHash, ipfsResult.ipfsURI, bloodType || "", allergies || ""
  );

  user.profileHash = profileHash;
  user.encryptedDataURI = ipfsResult.ipfsURI;
  user.bloodType = bloodType || "";
  user.allergies = allergies || "";
  user.onChainStatus = 1;
  user.txHashes.push(txResult.txHash);
  await user.save();

  res.json({ success: true, data: { user, tx: txResult, ipfs: ipfsResult }, message: "Registration submitted on-chain" });
});

exports.getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  let onChainStatus = null;
  if (user.walletAddress) {
    try { onChainStatus = Number(await getPatientStatusOnChain(user.walletAddress)); } catch (e) {}
  }
  res.json({ success: true, data: { user, onChainStatus } });
});

exports.updateEmergencyInfo = asyncHandler(async (req, res) => {
  const { bloodType, allergies, emergencyContact } = req.body;
  const updates = {};
  if (bloodType) updates.bloodType = bloodType;
  if (allergies) updates.allergies = allergies;
  if (emergencyContact) updates.emergencyContact = emergencyContact;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json({ success: true, data: user });
});

exports.getPatientById = asyncHandler(async (req, res) => {
  const patient = await User.findById(req.params.id).select("-password");
  if (!patient || patient.role !== "patient") {
    return res.status(404).json({ success: false, message: "Patient not found" });
  }
  res.json({ success: true, data: patient });
});

exports.deactivateAccount = asyncHandler(async (req, res) => {
  req.user.isActive = false;
  req.user.onChainStatus = 5;
  await req.user.save();
  res.json({ success: true, message: "Account deactivated" });
});
