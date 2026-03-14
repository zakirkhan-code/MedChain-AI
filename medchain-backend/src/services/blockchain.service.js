const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

BigInt.prototype.toJSON = function () {
  return Number(this);
};

let provider = null;
let wallet = null;
let contracts = {};
let initialized = false;

const loadABI = (name) => {
  try {
    const abiPath = path.join(__dirname, "..", "config", "abis.json");
    if (fs.existsSync(abiPath)) {
      const abis = JSON.parse(fs.readFileSync(abiPath, "utf8"));
      return abis[name];
    }
  } catch {}
  return null;
};

const initialize = () => {
  if (initialized) return true;
  try {
    if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
      console.warn("⚠️ Blockchain not configured");
      return false;
    }

    provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`🔑 Deployer wallet: ${wallet.address}`);

    const map = {
      MedChainCore: process.env.MEDCHAIN_CORE_ADDRESS,
      PatientRegistry: process.env.PATIENT_REGISTRY_ADDRESS,
      DoctorRegistry: process.env.DOCTOR_REGISTRY_ADDRESS,
      RecordManager: process.env.RECORD_MANAGER_ADDRESS,
      MedChainAccessControl: process.env.ACCESS_CONTROL_ADDRESS,
      ConsentLedger: process.env.CONSENT_LEDGER_ADDRESS,
    };

    for (const [name, address] of Object.entries(map)) {
      if (!address) {
        console.warn(`⚠️ ${name} address not set`);
        continue;
      }
      const abi = loadABI(name);
      if (!abi) {
        console.warn(`⚠️ ${name} ABI not found`);
        continue;
      }
      contracts[name] = new ethers.Contract(address, abi, wallet);
      console.log(` ${name} → ${address}`);
    }

    initialized = true;
    console.log(" Blockchain service ready");
    return true;
  } catch (err) {
    console.error("❌ Blockchain init failed:", err.message);
    return false;
  }
};

const c = (name) => {
  initialize();
  return contracts[name] || null;
};

// ==========================================
//  UTILITY
// ==========================================

const hashData = (data) => {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));
};

const safeTx = async (name, fn) => {
  try {
    const result = await fn();
    return { success: true, ...result };
  } catch (err) {
    console.error(`❌ ${name}:`, err.reason || err.message);
    return { success: false, message: err.reason || err.message };
  }
};

// ==========================================
//  PATIENT FUNCTIONS
// ==========================================

// NOTE: submitRegistration is called by patient themselves (msg.sender)
// Backend deployer CANNOT call this for patient
// We provide data preparation for frontend to call

const preparePatientRegistration = (profileData) => {
  const profileHash = hashData(profileData);
  const encryptedDataURI = `ipfs://medchain/patient/${Date.now()}`;
  return { profileHash, encryptedDataURI };
};

// Admin/Operator approves patient (deployer has ADMIN role)
const approvePatientOnChain = async (patientAddress) => {
  return safeTx("approvePatient", async () => {
    const contract = c("PatientRegistry");
    if (!contract) throw new Error("PatientRegistry not available");
    console.log(`📤 Approving patient: ${patientAddress}`);
    const tx = await contract.approveRegistration(patientAddress);
    const receipt = await tx.wait();
    console.log(` Patient approved. Block: ${receipt.blockNumber}`);
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const rejectPatientOnChain = async (patientAddress, reason) => {
  return safeTx("rejectPatient", async () => {
    const contract = c("PatientRegistry");
    if (!contract) throw new Error("PatientRegistry not available");
    const tx = await contract.rejectRegistration(patientAddress, reason);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const getPatientOnChain = async (patientAddress) => {
  try {
    const contract = c("PatientRegistry");
    if (!contract) return null;
    const status = await contract.getPatientStatus(patientAddress);
    return { status: Number(status) };
  } catch {
    return null;
  }
};

const getPatientProfile = async (patientAddress) => {
  try {
    const contract = c("PatientRegistry");
    if (!contract) return null;
    const data = await contract.getPatient(patientAddress);
    return {
      walletAddress: data.walletAddress,
      profileHash: data.profileHash,
      status: Number(data.status),
      isActive: data.isActive,
      totalRecords: Number(data.totalRecords),
      bloodType: data.bloodType,
      allergies: data.allergies,
      registeredAt: Number(data.registeredAt),
    };
  } catch {
    return null;
  }
};

// ==========================================
//  DOCTOR FUNCTIONS
// ==========================================

// NOTE: submitApplication is called by doctor themselves (msg.sender)
// Backend prepares data, frontend calls contract

const prepareDoctorApplication = (credentials) => {
  const credentialHash = hashData(credentials);
  const encryptedDataURI = `ipfs://medchain/doctor/${Date.now()}`;
  return { credentialHash, encryptedDataURI };
};

// Admin verifies doctor (deployer has ADMIN role)
const verifyDoctorOnChain = async (doctorAddress) => {
  return safeTx("verifyDoctor", async () => {
    const contract = c("DoctorRegistry");
    if (!contract) throw new Error("DoctorRegistry not available");
    console.log(`📤 Verifying doctor: ${doctorAddress}`);
    const tx = await contract.verifyDoctor(doctorAddress);
    const receipt = await tx.wait();
    console.log(` Doctor verified. Block: ${receipt.blockNumber}`);
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const rejectDoctorOnChain = async (doctorAddress, reason) => {
  return safeTx("rejectDoctor", async () => {
    const contract = c("DoctorRegistry");
    if (!contract) throw new Error("DoctorRegistry not available");
    const tx = await contract.rejectDoctor(doctorAddress, reason);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const suspendDoctorOnChain = async (doctorAddress, reason) => {
  return safeTx("suspendDoctor", async () => {
    const contract = c("DoctorRegistry");
    if (!contract) throw new Error("DoctorRegistry not available");
    const tx = await contract.suspendDoctor(doctorAddress, reason);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const getDoctorOnChain = async (doctorAddress) => {
  try {
    const contract = c("DoctorRegistry");
    if (!contract) return null;
    const status = await contract.getDocStatus(doctorAddress);
    return { status: Number(status) };
  } catch {
    return null;
  }
};

const getDoctorProfile = async (doctorAddress) => {
  try {
    const contract = c("DoctorRegistry");
    if (!contract) return null;
    const data = await contract.getDoctor(doctorAddress);
    return {
      walletAddress: data.walletAddress,
      credentialHash: data.credentialHash,
      specialization: data.specialization,
      licenseNumber: data.licenseNumber,
      status: Number(data.status),
      isVerified: data.isVerified,
      totalPatients: Number(data.totalPatients),
      registeredAt: Number(data.registeredAt),
    };
  } catch {
    return null;
  }
};

// ==========================================
//  RECORD FUNCTIONS
// ==========================================

// createRecord CAN be called by deployer (if deployer has DOCTOR/ADMIN role)
// createRecord(address _patient, bytes32 _contentHash, string _ipfsURI,
//              string _encryptionKeyHash, uint8 _recordType, string _description)

const createRecordOnChain = async (
  patientAddress,
  contentHash,
  ipfsURI,
  encryptionKeyHash,
  recordType,
  description,
) => {
  return safeTx("createRecord", async () => {
    const contract = c("RecordManager");
    if (!contract) throw new Error("RecordManager not available");

    // Map recordType string to uint8
    const typeMap = {
      LabReport: 0,
      Prescription: 1,
      Imaging: 2,
      Diagnosis: 3,
      Vaccination: 4,
      Surgery: 5,
      Discharge: 6,
      Other: 7,
    };
    const typeNum = typeMap[recordType] !== undefined ? typeMap[recordType] : 7;

    console.log(`📤 Creating record on-chain for: ${patientAddress}`);
    const tx = await contract.createRecord(
      patientAddress,
      contentHash,
      ipfsURI || "",
      encryptionKeyHash || "",
      typeNum,
      description || "",
    );
    const receipt = await tx.wait();
    console.log(` Record created on-chain. Block: ${receipt.blockNumber}`);
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const verifyRecordOnChain = async (recordId, contentHash) => {
  try {
    const contract = c("RecordManager");
    if (!contract) return null;
    const result = await contract.verifyRecord(recordId, contentHash);
    return result;
  } catch {
    return null;
  }
};

const getRecordOnChain = async (recordId) => {
  try {
    const contract = c("RecordManager");
    if (!contract) return null;
    const data = await contract.getRecord(recordId);
    return {
      patient: data.patient,
      contentHash: data.contentHash,
      ipfsURI: data.ipfsURI,
      recordType: Number(data.recordType),
      status: Number(data.status),
      version: Number(data.version),
      createdAt: Number(data.createdAt),
    };
  } catch {
    return null;
  }
};

// ==========================================
//  ACCESS CONTROL FUNCTIONS
// ==========================================

// grantAccess is called by PATIENT (msg.sender) — cannot do from backend
// requestAccess is called by DOCTOR (msg.sender)
// approveRequest/rejectRequest called by PATIENT

// Admin can grant emergency access
const grantEmergencyAccess = async (patientAddress, providerAddress) => {
  return safeTx("emergencyAccess", async () => {
    const contract = c("MedChainAccessControl");
    if (!contract) throw new Error("AccessControl not available");
    const tx = await contract.grantEmergencyAccess(
      patientAddress,
      providerAddress,
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const checkAccessOnChain = async (patientAddress, providerAddress) => {
  try {
    const contract = c("MedChainAccessControl");
    if (!contract) return null;
    const result = await contract.checkAccess(patientAddress, providerAddress);
    return result;
  } catch {
    return null;
  }
};

const getPermissionOnChain = async (patientAddress, providerAddress) => {
  try {
    const contract = c("MedChainAccessControl");
    if (!contract) return null;
    const data = await contract.getPermission(patientAddress, providerAddress);
    return {
      isActive: data.isActive,
      level: Number(data.level),
      grantedAt: Number(data.grantedAt),
      expiresAt: Number(data.expiresAt),
      purpose: data.purpose,
    };
  } catch {
    return null;
  }
};

// ==========================================
//  CONSENT LEDGER
// ==========================================

// Admin can log consent on behalf
const adminLogConsent = async (
  patientAddress,
  actorAddress,
  action,
  details,
) => {
  return safeTx("adminLogConsent", async () => {
    const contract = c("ConsentLedger");
    if (!contract) throw new Error("ConsentLedger not available");
    const tx = await contract.adminLogConsent(
      patientAddress,
      actorAddress,
      action,
      details,
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const getPatientConsentHistory = async (patientAddress) => {
  try {
    const contract = c("ConsentLedger");
    if (!contract) return [];
    return await contract.getPatientHistory(patientAddress);
  } catch {
    return [];
  }
};

// ==========================================
//  MEDCHAIN CORE — ROLES & STATS
// ==========================================

const grantPatientRole = async (patientAddress) => {
  return safeTx("grantPatientRole", async () => {
    const contract = c("MedChainCore");
    if (!contract) throw new Error("MedChainCore not available");
    const tx = await contract.grantPatientRole(patientAddress);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const grantDoctorRole = async (doctorAddress) => {
  return safeTx("grantDoctorRole", async () => {
    const contract = c("MedChainCore");
    if (!contract) throw new Error("MedChainCore not available");
    const tx = await contract.grantDoctorRole(doctorAddress);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const revokePatientRole = async (patientAddress) => {
  return safeTx("revokePatientRole", async () => {
    const contract = c("MedChainCore");
    if (!contract) throw new Error("MedChainCore not available");
    const tx = await contract.revokePatientRole(patientAddress);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const revokeDoctorRole = async (doctorAddress) => {
  return safeTx("revokeDoctorRole", async () => {
    const contract = c("MedChainCore");
    if (!contract) throw new Error("MedChainCore not available");
    const tx = await contract.revokeDoctorRole(doctorAddress);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  });
};

const getPlatformStats = async () => {
  try {
    const contract = c("MedChainCore");
    if (!contract) return null;
    const stats = await contract.getPlatformStats();
    return {
      totalUsers: Number(stats[0]),
      totalRecords: Number(stats[1]),
      totalConsents: Number(stats[2]),
      isPaused: stats[3],
    };
  } catch {
    return null;
  }
};

const checkRole = async (role, address) => {
  try {
    const contract = c("MedChainCore");
    if (!contract) return false;
    const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role));
    return await contract.checkRole(roleHash, address);
  } catch {
    return false;
  }
};

module.exports = {
  initialize,
  hashData,

  // Patient
  preparePatientRegistration,
  approvePatientOnChain,
  rejectPatientOnChain,
  getPatientOnChain,
  getPatientProfile,

  // Doctor
  prepareDoctorApplication,
  verifyDoctorOnChain,
  rejectDoctorOnChain,
  suspendDoctorOnChain,
  getDoctorOnChain,
  getDoctorProfile,

  // Records
  createRecordOnChain,
  verifyRecordOnChain,
  getRecordOnChain,

  // Access
  grantEmergencyAccess,
  checkAccessOnChain,
  getPermissionOnChain,

  // Consent
  adminLogConsent,
  getPatientConsentHistory,

  // Core
  grantPatientRole,
  grantDoctorRole,
  revokePatientRole,
  revokeDoctorRole,
  getPlatformStats,
  checkRole,
};
