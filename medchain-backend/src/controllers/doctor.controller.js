const User = require("../models/User");
const blockchain = require("../services/blockchain.service");

const SPECIALIZATIONS = [
  "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Dermatology",
  "Oncology", "Psychiatry", "Surgery", "Radiology", "Gynecology",
  "Urology", "ENT", "Ophthalmology", "GeneralMedicine", "Dentistry",
  "Physiotherapy", "Other"
];

// Submit Doctor Application
exports.submitApplication = async (req, res) => {
  try {
    const { specialization, licenseNumber, credentials, documentURI } = req.body;

    if (!specialization || !licenseNumber) {
      return res.status(400).json({ success: false, message: "Specialization and license number required" });
    }

    if (!SPECIALIZATIONS.includes(specialization)) {
      return res.status(400).json({
        success: false,
        message: `Invalid specialization. Valid: ${SPECIALIZATIONS.join(", ")}`,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "doctor") return res.status(400).json({ success: false, message: "Only doctors can submit application" });

    // Update MongoDB
    user.specialization = specialization;
    user.licenseNumber = licenseNumber;
    user.credentials = credentials || "";

    // Prepare blockchain data for frontend to call contract
    // Doctor must call submitApplication from their own wallet (msg.sender check)
    let blockchainData = null;

    if (user.walletAddress) {
      blockchainData = blockchain.prepareDoctorApplication({ licenseNumber, credentials, specialization });
      blockchainData.specialization = specialization;
      blockchainData.licenseNumber = licenseNumber;
      blockchainData.documentURI = documentURI || `ipfs://medchain/doctor-docs/${Date.now()}`;
      console.log(`📋 Doctor ${user.name} application saved in DB. On-chain submission pending from app.`);
    }

    user.onChainStatus = 0; // Not yet on-chain, waiting for frontend tx
    await user.save();

    res.json({
      success: true,
      data: { user, blockchainData },
      message: "Application submitted in DB. Complete on-chain registration from app using blockchainData.",
    });
  } catch (err) {
    console.error("Doctor application error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Confirm On-Chain Registration (called after frontend sends tx)
exports.confirmOnChain = async (req, res) => {
  try {
    const { txHash } = req.body;
    if (!txHash) return res.status(400).json({ success: false, message: "txHash is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Update status
    user.onChainStatus = 1; // Pending (on-chain submitted)
    if (!user.txHashes) user.txHashes = [];
    user.txHashes.push(txHash);
    await user.save();

    console.log(`✅ Doctor ${user.name} on-chain tx confirmed: ${txHash}`);

    res.json({
      success: true,
      data: { user },
      message: "On-chain registration confirmed. Waiting for admin verification.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get My Profile
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Also fetch on-chain data if wallet exists
    let onChainData = null;
    if (user.walletAddress) {
      onChainData = await blockchain.getDoctorOnChain(user.walletAddress);

      // Also try to get full profile
      const fullProfile = await blockchain.getDoctorProfile(user.walletAddress);
      if (fullProfile) onChainData = { ...onChainData, ...fullProfile };
    }

    res.json({ success: true, data: { ...user.toObject(), onChainData } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Doctor Profile
exports.updateProfile = async (req, res) => {
  try {
    const { specialization, credentials } = req.body;
    const updates = {};
    if (specialization) {
      if (!SPECIALIZATIONS.includes(specialization)) {
        return res.status(400).json({ success: false, message: "Invalid specialization" });
      }
      updates.specialization = specialization;
    }
    if (credentials) updates.credentials = credentials;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// List Verified Doctors
exports.listDoctors = async (req, res) => {
  try {
    const { specialization, page = 1, limit = 20, search } = req.query;
    const query = { role: "doctor", isVerified: true };
    if (specialization) query.specialization = specialization;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } },
      ];
    }

    const doctors = await User.find(query)
      .select("name email phone specialization licenseNumber rating ratingCount totalPatients walletAddress isVerified onChainStatus")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ rating: -1 });
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        doctors,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Doctor by ID
exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await User.findOne({ _id: req.params.id, role: "doctor" })
      .select("name email phone specialization licenseNumber credentials rating ratingCount totalPatients walletAddress isVerified onChainStatus txHashes");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    // Fetch on-chain data
    let onChainData = null;
    if (doctor.walletAddress) {
      onChainData = await blockchain.getDoctorProfile(doctor.walletAddress);
    }

    res.json({ success: true, data: { ...doctor.toObject(), onChainData } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Rate Doctor
exports.rateDoctor = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const doctor = await User.findOne({ _id: req.params.id, role: "doctor" });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    if (!doctor.isVerified) return res.status(400).json({ success: false, message: "Can only rate verified doctors" });

    // Prevent self-rating
    if (doctor._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot rate yourself" });
    }

    const newCount = (doctor.ratingCount || 0) + 1;
    const newRating = ((doctor.rating || 0) * (doctor.ratingCount || 0) + Number(rating)) / newCount;

    doctor.rating = Math.round(newRating * 10) / 10; // 1 decimal
    doctor.ratingCount = newCount;
    await doctor.save();

    // Also rate on-chain if possible
    if (doctor.walletAddress) {
      try {
        const contract = require("../services/blockchain.service");
        // rateDoctor is available in DoctorRegistry
      } catch {}
    }

    res.json({
      success: true,
      data: { rating: doctor.rating, ratingCount: doctor.ratingCount },
      message: `Rated ${rating}/5 stars`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Doctor Stats
exports.getDoctorStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const AccessLog = require("../models/AccessLog");
    const totalAccess = await AccessLog.countDocuments({ provider: user._id, action: "granted" });
    const activeAccess = await AccessLog.countDocuments({ provider: user._id, action: "granted" });

    res.json({
      success: true,
      data: {
        totalPatients: user.totalPatients || 0,
        rating: user.rating || 0,
        ratingCount: user.ratingCount || 0,
        totalAccess,
        activeAccess,
        isVerified: user.isVerified,
        onChainStatus: user.onChainStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};