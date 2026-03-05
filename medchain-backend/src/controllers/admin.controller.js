const User = require("../models/User");
const MedicalRecord = require("../models/MedicalRecord");
const AIInteraction = require("../models/AIInteraction");
const AccessLog = require("../models/AccessLog");
const blockchain = require("../services/blockchain.service");

// Helper: safe notification call
const tryNotify = async (fn, ...args) => {
  try {
    const notifService = require("../services/notification.service");
    if (notifService[fn]) await notifService[fn](...args);
  } catch (err) {
    console.warn(`⚠️ Notification failed (${fn}):`, err.message);
  }
};

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalPatients, totalDoctors, totalRecords, pendingDoctors, pendingPatients] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "doctor" }),
      MedicalRecord.countDocuments(),
      User.countDocuments({ role: "doctor", isVerified: false, specialization: { $exists: true, $ne: "" } }),
      User.countDocuments({ role: "patient", onChainStatus: 1 }),
    ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt walletAddress");
    const recentRecords = await MedicalRecord.find().sort({ createdAt: -1 }).limit(5).populate("patient", "name").select("title recordType patient createdAt");

    let totalAI = 0;
    try { totalAI = await AIInteraction.countDocuments(); } catch {}

    // On-chain stats
    const chainStats = await blockchain.getPlatformStats();

    res.json({
      success: true,
      data: {
        stats: { totalUsers, totalPatients, totalDoctors, totalRecords, pendingDoctors, pendingPatients, totalAI },
        recentUsers,
        recentRecords,
        chainStats,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Users
exports.getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 15, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { cnic: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-password");
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Pending Doctors
exports.getPendingDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const query = { role: "doctor", isVerified: false, specialization: { $exists: true, $ne: "" } };

    const doctors = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-password");
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: { doctors, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Verify Doctor
exports.verifyDoctor = async (req, res) => {
  try {
    const doctor = await User.findOne({ _id: req.params.id, role: "doctor" });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    if (doctor.isVerified) return res.status(400).json({ success: false, message: "Doctor already verified" });

    let blockchainResult = null;
    let chainError = null;

    // Try on-chain verify (deployer has ADMIN role)
    if (doctor.walletAddress) {
      blockchainResult = await blockchain.verifyDoctorOnChain(doctor.walletAddress);

      if (blockchainResult.success) {
        // Also grant DOCTOR_ROLE in MedChainCore
        const roleResult = await blockchain.grantDoctorRole(doctor.walletAddress);
        console.log(`✅ Doctor role granted: ${roleResult.success}`);

        if (!doctor.txHashes) doctor.txHashes = [];
        doctor.txHashes.push(blockchainResult.txHash);
        if (roleResult.success && roleResult.txHash) {
          doctor.txHashes.push(roleResult.txHash);
        }
      } else {
        chainError = blockchainResult.message;
        console.warn(`⚠️ On-chain verify failed: ${chainError}`);
      }
    }

    // MongoDB update (always works)
    doctor.isVerified = true;
    doctor.verifiedBy = req.user._id;
    doctor.verifiedAt = new Date();
    doctor.onChainStatus = blockchainResult?.success ? 2 : doctor.onChainStatus;
    await doctor.save();

    // Send notification
    await tryNotify("notifyDoctorVerified", doctor._id);

    res.json({
      success: true,
      data: { doctor, blockchain: blockchainResult },
      message: blockchainResult?.success
        ? "Doctor verified (On-chain ✓)"
        : `Doctor verified (Off-chain only${chainError ? ": " + chainError : ""})`,
    });
  } catch (err) {
    console.error("Verify doctor error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject Doctor
exports.rejectDoctor = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: "Reason is required" });

    const doctor = await User.findOne({ _id: req.params.id, role: "doctor" });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    let blockchainResult = null;

    if (doctor.walletAddress) {
      blockchainResult = await blockchain.rejectDoctorOnChain(doctor.walletAddress, reason);
      if (blockchainResult.success) {
        if (!doctor.txHashes) doctor.txHashes = [];
        doctor.txHashes.push(blockchainResult.txHash);
      }
    }

    doctor.isVerified = false;
    doctor.onChainStatus = blockchainResult?.success ? 3 : doctor.onChainStatus;
    doctor.rejectionReason = reason;
    await doctor.save();

    await tryNotify("notifyDoctorRejected", doctor._id, reason);

    res.json({
      success: true,
      data: { doctor, blockchain: blockchainResult },
      message: blockchainResult?.success
        ? "Doctor rejected (On-chain ✓)"
        : "Doctor rejected (Off-chain only)",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Suspend Doctor
exports.suspendDoctor = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: "Reason is required" });

    const doctor = await User.findOne({ _id: req.params.id, role: "doctor" });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    let blockchainResult = null;

    if (doctor.walletAddress) {
      blockchainResult = await blockchain.suspendDoctorOnChain(doctor.walletAddress, reason);

      if (blockchainResult.success) {
        // Also revoke DOCTOR_ROLE
        await blockchain.revokeDoctorRole(doctor.walletAddress);

        if (!doctor.txHashes) doctor.txHashes = [];
        doctor.txHashes.push(blockchainResult.txHash);
      }
    }

    doctor.isVerified = false;
    doctor.onChainStatus = blockchainResult?.success ? 4 : doctor.onChainStatus;
    doctor.suspensionReason = reason;
    await doctor.save();

    res.json({
      success: true,
      data: { doctor, blockchain: blockchainResult },
      message: blockchainResult?.success
        ? "Doctor suspended (On-chain ✓)"
        : "Doctor suspended (Off-chain only)",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve Patient
exports.approvePatient = async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, role: "patient" });
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    let blockchainResult = null;

    if (patient.walletAddress) {
      blockchainResult = await blockchain.approvePatientOnChain(patient.walletAddress);

      if (blockchainResult.success) {
        // Also grant PATIENT_ROLE
        const roleResult = await blockchain.grantPatientRole(patient.walletAddress);
        console.log(`✅ Patient role granted: ${roleResult.success}`);

        if (!patient.txHashes) patient.txHashes = [];
        patient.txHashes.push(blockchainResult.txHash);
        if (roleResult.success && roleResult.txHash) {
          patient.txHashes.push(roleResult.txHash);
        }
      }
    }

    patient.onChainStatus = blockchainResult?.success ? 2 : 2;
    await patient.save();

    await tryNotify("notifyPatientApproved", patient._id);

    res.json({
      success: true,
      data: { patient, blockchain: blockchainResult },
      message: blockchainResult?.success
        ? "Patient approved (On-chain ✓)"
        : "Patient approved (Off-chain only)",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject Patient
exports.rejectPatient = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: "Reason is required" });

    const patient = await User.findOne({ _id: req.params.id, role: "patient" });
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    let blockchainResult = null;

    if (patient.walletAddress) {
      blockchainResult = await blockchain.rejectPatientOnChain(patient.walletAddress, reason);
      if (blockchainResult.success) {
        if (!patient.txHashes) patient.txHashes = [];
        patient.txHashes.push(blockchainResult.txHash);
      }
    }

    patient.onChainStatus = blockchainResult?.success ? 3 : 3;
    patient.rejectionReason = reason;
    await patient.save();

    res.json({
      success: true,
      data: { patient, blockchain: blockchainResult },
      message: blockchainResult?.success
        ? "Patient rejected (On-chain ✓)"
        : "Patient rejected (Off-chain only)",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Pending Patients
exports.getPendingPatients = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const query = { role: "patient", onChainStatus: 1 };

    const patients = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select("-password");
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: { patients, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Patient by ID
exports.getPatientById = async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, role: "patient" }).select("-password");
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    // Fetch on-chain data
    let onChainData = null;
    if (patient.walletAddress) {
      onChainData = await blockchain.getPatientProfile(patient.walletAddress);
    }

    res.json({ success: true, data: { ...patient.toObject(), onChainData } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Audit Logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const logs = await AccessLog.find()
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("patient", "name email walletAddress")
      .populate("provider", "name email walletAddress");
    const total = await AccessLog.countDocuments();

    res.json({
      success: true,
      data: { logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// AI Analytics
exports.getAIAnalytics = async (req, res) => {
  try {
    let totalInteractions = 0;
    let byType = [];
    let totalTokensUsed = 0;

    try {
      totalInteractions = await AIInteraction.countDocuments();
      byType = await AIInteraction.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]);
      const tokenAgg = await AIInteraction.aggregate([{ $group: { _id: null, total: { $sum: "$tokensUsed" } } }]);
      totalTokensUsed = tokenAgg[0]?.total || 0;
    } catch {}

    res.json({
      success: true,
      data: { totalInteractions, byType, totalTokensUsed },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Platform Stats (On-Chain)
exports.getChainStats = async (req, res) => {
  try {
    const stats = await blockchain.getPlatformStats();
    if (!stats) return res.status(503).json({ success: false, message: "Blockchain not available" });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};