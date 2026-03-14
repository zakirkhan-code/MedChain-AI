import { ethers } from "ethers";
import abis from "./abis.json";

const ADDRESSES = {
  MedChainCore: "0x780A102E26D2c166e89dEECDB3508C889a58c34b",
  PatientRegistry: "0x49C33d095AdB51bC94D27982126812955179C030",
  DoctorRegistry: "0xf327c76aF61C7af390f94D2d7EeC60B0B2fa0F29",
  RecordManager: "0xd2d67800BFAd629445f78751e053d49A67Bb6Eb3",
  MedChainAccessControl: "0x9A2560C82aa726d6dE2e1F83b59268e723EF69A7",
  ConsentLedger: "0xE19f3AE604Ce7a74788EC34c34FF5717c24d5471",
};

const RPC_URL =
  "https://eth-sepolia.g.alchemy.com/v2/o3bRe0lLz7rIfkhWPxx-rETKggQzl1GB";

// Read-only provider (no wallet needed)
export const getProvider = () => {
  return new ethers.JsonRpcProvider(RPC_URL);
};

// Get contract for reading
export const getReadContract = (name) => {
  const provider = getProvider();
  return new ethers.Contract(ADDRESSES[name], abis[name], provider);
};

// Get contract with signer (user's private key)
export const getSignedContract = (name, privateKey) => {
  const provider = getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(ADDRESSES[name], abis[name], wallet);
};

// Hash data
export const hashData = (data) => {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));
};

// ==========================================
//  PATIENT FUNCTIONS
// ==========================================

export const patientSubmitRegistration = async (
  privateKey,
  profileData,
  bloodType,
  allergies,
) => {
  try {
    const contract = getSignedContract("PatientRegistry", privateKey);
    const profileHash = hashData({ ...profileData, timestamp: Date.now(), random: Math.random().toString() });
    const encryptedDataURI = `ipfs://medchain/patient/${Date.now()}`;

    console.log("📤 Submitting patient registration on-chain...");
    const tx = await contract.submitRegistration(
      profileHash,
      encryptedDataURI,
      bloodType || "",
      allergies || "",
    );
    console.log("⏳ Waiting for confirmation...", tx.hash);
    const receipt = await tx.wait();
    console.log(" Patient registered on-chain! Block:", receipt.blockNumber);

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      profileHash,
      encryptedDataURI,
    };
  } catch (err) {
    console.error("❌ Patient registration failed:", err.reason || err.message);
    return { success: false, message: err.reason || err.message };
  }
};

export const patientGiveConsent = async (privateKey) => {
  try {
    const contract = getSignedContract("PatientRegistry", privateKey);
    console.log("📤 Giving consent...");
    const tx = await contract.giveConsent();
    const receipt = await tx.wait();
    console.log(" Consent given! Patient is now Active");
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    return { success: false, message: err.reason || err.message };
  }
};

export const getPatientStatus = async (walletAddress) => {
  try {
    const contract = getReadContract("PatientRegistry");
    const status = await contract.getPatientStatus(walletAddress);
    return Number(status);
  } catch {
    return 0;
  }
};

// ==========================================
//  DOCTOR FUNCTIONS
// ==========================================

export const doctorSubmitApplication = async (
  privateKey,
  credentials,
  specialization,
  licenseNumber,
) => {
  try {
    const contract = getSignedContract("DoctorRegistry", privateKey);
    const credentialHash = hashData({
      credentials,
      specialization,
      licenseNumber,
    });
    const encryptedDataURI = `ipfs://medchain/doctor/${Date.now()}`;
    const documentURI = `ipfs://medchain/doctor-docs/${Date.now()}`;

    console.log("📤 Submitting doctor application on-chain...");
    const tx = await contract.submitApplication(
      credentialHash,
      encryptedDataURI,
      specialization,
      licenseNumber,
      documentURI,
    );
    console.log("⏳ Waiting for confirmation...", tx.hash);
    const receipt = await tx.wait();
    console.log(
      " Doctor application submitted on-chain! Block:",
      receipt.blockNumber,
    );

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      credentialHash,
    };
  } catch (err) {
    console.error("❌ Doctor application failed:", err.reason || err.message);
    return { success: false, message: err.reason || err.message };
  }
};

export const getDoctorStatus = async (walletAddress) => {
  try {
    const contract = getReadContract("DoctorRegistry");
    const status = await contract.getDocStatus(walletAddress);
    return Number(status);
  } catch {
    return 0;
  }
};

// ==========================================
//  RECORD FUNCTIONS
// ==========================================

export const createRecordOnChain = async (
  privateKey,
  patientAddress,
  contentHash,
  ipfsURI,
  recordType,
  description,
) => {
  try {
    const contract = getSignedContract("RecordManager", privateKey);
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
    const encryptionKeyHash = hashData({ key: Date.now() });

    console.log("📤 Creating record on-chain...");
    const tx = await contract.createRecord(
      patientAddress,
      contentHash,
      ipfsURI || "",
      encryptionKeyHash,
      typeNum,
      description || "",
    );
    const receipt = await tx.wait();
    console.log(" Record created on-chain!");
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    return { success: false, message: err.reason || err.message };
  }
};

// ==========================================
//  ACCESS CONTROL FUNCTIONS
// ==========================================

export const grantAccessOnChain = async (
  privateKey,
  providerAddress,
  level,
  duration,
  allowedTypes,
  purpose,
) => {
  try {
    const contract = getSignedContract("MedChainAccessControl", privateKey);
    const levelNum = level === "ReadWrite" ? 2 : 1;

    console.log("📤 Granting access on-chain...");
    const tx = await contract.grantAccess(
      providerAddress,
      levelNum,
      duration,
      allowedTypes,
      purpose || "",
      { gasLimit: 1000000 }
    );
    const receipt = await tx.wait();
    console.log(" Access granted on-chain!");
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    return { success: false, message: err.reason || err.message };
  }
};

export const revokeAccessOnChain = async (privateKey, providerAddress) => {
  try {
    const contract = getSignedContract("MedChainAccessControl", privateKey);
    const tx = await contract.revokeAccess(providerAddress);
    const receipt = await tx.wait();
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    return { success: false, message: err.reason || err.message };
  }
};

// ==========================================
//  READ FUNCTIONS
// ==========================================

export const getPlatformStats = async () => {
  try {
    const contract = getReadContract("MedChainCore");
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

export const checkAccess = async (patientAddress, providerAddress) => {
  try {
    const contract = getReadContract("MedChainAccessControl");
    return await contract.checkAccess(patientAddress, providerAddress);
  } catch {
    return false;
  }
};

export const STATUS_MAP = {
  patient: {
    0: "None",
    1: "Pending",
    2: "Approved",
    3: "Rejected",
    4: "Active",
    5: "Deactivated",
  },
  doctor: {
    0: "None",
    1: "Pending",
    2: "Verified",
    3: "Rejected",
    4: "Suspended",
  },
};
