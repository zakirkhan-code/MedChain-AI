const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { hashData } = require("../services/blockchain.service");

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || "7d" });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, cnic, password, role, phone, walletAddress } = req.body;

  if (email) {
  const existingEmail = await User.findOne({ email });
  if (existingEmail) return res.status(400).json({ success: false, message: "Email already registered" });
  }
  if (cnic) {
    const existingCnic = await User.findOne({ cnic });
    if (existingCnic) return res.status(400).json({ success: false, message: "CNIC already registered" });
  }
  if (!email && !cnic) return res.status(400).json({ success: false, message: "Email or CNIC is required" });

  if (walletAddress) {
    const walletExists = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (walletExists) return res.status(400).json({ success: false, message: "Wallet already linked" });
  }

  const user = await User.create({
    name, email, password,
    role: role || "patient",
    phone,
    walletAddress: walletAddress ? walletAddress.toLowerCase() : undefined,
  });

  res.status(201).json({
    success: true,
    data: { user, token: generateToken(user._id) },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, cnic, walletAddress, password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: "Password is required" });
  if (!email && !cnic && !walletAddress) return res.status(400).json({ success: false, message: "Provide email, CNIC, or wallet address" });

  let query = {};
  if (cnic && walletAddress) {
    query = { cnic, walletAddress: walletAddress.toLowerCase() };
  } else if (cnic) {
    query = { cnic };
  } else if (email) {
    query = { email };
  } else if (walletAddress) {
    query = { walletAddress: walletAddress.toLowerCase() };
  }

  const user = await User.findOne(query).select("+password");
  if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

  user.lastLogin = new Date();
  await user.save();

  res.json({ success: true, data: { user, token: generateToken(user._id) } });
});

exports.walletLogin = asyncHandler(async (req, res) => {
  const { walletAddress, message, signature } = req.body;

  const recovered = ethers.verifyMessage(message, signature);
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
    return res.status(401).json({ success: false, message: "Invalid signature" });
  }

  let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (!user) return res.status(404).json({ success: false, message: "Wallet not registered. Please register first." });

  user.lastLogin = new Date();
  await user.save();

  res.json({ success: true, data: { user, token: generateToken(user._id) } });
});

exports.connectWallet = asyncHandler(async (req, res) => {
  const { walletAddress, message, signature } = req.body;

  const recovered = ethers.verifyMessage(message, signature);
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
    return res.status(401).json({ success: false, message: "Invalid signature" });
  }

  const walletExists = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (walletExists) return res.status(400).json({ success: false, message: "Wallet already linked to another account" });

  req.user.walletAddress = walletAddress.toLowerCase();
  await req.user.save();

  res.json({ success: true, data: req.user, message: "Wallet connected" });
});

exports.getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar, fcmToken } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (avatar) updates.avatar = avatar;
  if (fcmToken) updates.fcmToken = fcmToken;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json({ success: true, data: user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(400).json({ success: false, message: "Current password incorrect" });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password updated" });
});
