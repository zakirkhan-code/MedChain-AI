const User = require("../models/User");
const jwt = require("jsonwebtoken");
const blockchain = require("../services/blockchain.service");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || "7d" });
};

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, cnic, password, role, phone, walletAddress } = req.body;

    // Validation
    if (!name || !password) {
      return res.status(400).json({ success: false, message: "Name and password are required" });
    }
    if (!email && !cnic) {
      return res.status(400).json({ success: false, message: "Email or CNIC is required" });
    }

    // Duplicate checks
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(400).json({ success: false, message: "Email already registered" });
    }
    if (cnic) {
      const existingCnic = await User.findOne({ cnic });
      if (existingCnic) return res.status(400).json({ success: false, message: "CNIC already registered" });
    }
    if (walletAddress) {
      const existingWallet = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      if (existingWallet) return res.status(400).json({ success: false, message: "Wallet already registered" });
    }

    // Create user in MongoDB
    const user = await User.create({
      name, email, cnic, password, role: role || "patient",
      phone, walletAddress: walletAddress?.toLowerCase(),
    });

    // Blockchain registration happens from frontend (patient/doctor signs themselves)
    // Backend just prepares data for frontend to call contract
    let blockchainData = null;

    if (walletAddress) {
      if (role === "patient" || !role) {
        blockchainData = blockchain.preparePatientRegistration({ name, cnic, phone });
        console.log(`📋 Patient ${name} registered in DB. On-chain registration pending from app.`);
      }
      // Doctor registers on-chain when they submit application (not during signup)
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id, name: user.name, email: user.email, cnic: user.cnic,
          role: user.role, phone: user.phone, walletAddress: user.walletAddress,
          onChainStatus: user.onChainStatus,
        },
        token,
        blockchainData,
      },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, cnic, walletAddress, password } = req.body;

    if (!password) return res.status(400).json({ success: false, message: "Password is required" });
    if (!email && !cnic && !walletAddress) {
      return res.status(400).json({ success: false, message: "Provide email, CNIC, or wallet address" });
    }

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

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id, name: user.name, email: user.email, cnic: user.cnic,
          role: user.role, phone: user.phone, walletAddress: user.walletAddress,
          onChainStatus: user.onChainStatus, isVerified: user.isVerified,
          specialization: user.specialization, bloodType: user.bloodType,
          totalRecords: user.totalRecords, totalPatients: user.totalPatients,
          rating: user.rating, ratingCount: user.ratingCount,
        },
        token,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Fetch on-chain status if wallet exists
    let onChainData = null;
    if (user.walletAddress) {
      if (user.role === "patient") {
        onChainData = await blockchain.getPatientOnChain(user.walletAddress);
      } else if (user.role === "doctor") {
        onChainData = await blockchain.getDoctorOnChain(user.walletAddress);
      }
    }

    res.json({ success: true, data: { ...user.toObject(), onChainData } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both passwords required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: "Current password incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password changed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};