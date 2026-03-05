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

// ==========================================
//  PROVIDER & SIGNER
// ==========================================

const getProvider = () => {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  return new ethers.BrowserProvider(window.ethereum);
};

const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

const getSignedContract = async (name) => {
  const signer = await getSigner();
  if (!abis[name]) throw new Error(`ABI for ${name} not found`);
  return new ethers.Contract(ADDRESSES[name], abis[name], signer);
};

const getReadContract = async (name) => {
  const provider = getProvider();
  if (!abis[name]) throw new Error(`ABI for ${name} not found`);
  return new ethers.Contract(ADDRESSES[name], abis[name], provider);
};

// ==========================================
//  CONNECT METAMASK
// ==========================================

export const connectMetaMask = async () => {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const address = accounts[0];

  // Switch to Sepolia
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0xaa36a7",
          chainName: "Sepolia Testnet",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    }
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  return {
    address,
    chainId: Number(network.chainId),
    isCorrectNetwork: Number(network.chainId) === 11155111,
  };
};

export const formatAddress = (addr) => {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// ==========================================
//  READ FUNCTIONS
// ==========================================

export const getPlatformStats = async () => {
  try {
    const contract = await getReadContract("MedChainCore");
    const stats = await contract.getPlatformStats();
    return {
      totalUsers: Number(stats[0]),
      totalRecords: Number(stats[1]),
      totalConsents: Number(stats[2]),
      isPaused: stats[3],
    };
  } catch (err) {
    console.error("getPlatformStats error:", err);
    return null;
  }
};

export const getPatientStatus = async (address) => {
  try {
    const contract = await getReadContract("PatientRegistry");
    const status = await contract.getPatientStatus(address);
    return Number(status);
  } catch { return 0; }
};

export const getDoctorStatus = async (address) => {
  try {
    const contract = await getReadContract("DoctorRegistry");
    const status = await contract.getDocStatus(address);
    return Number(status);
  } catch { return 0; }
};

export const getPatientProfile = async (address) => {
  try {
    const contract = await getReadContract("PatientRegistry");
    const data = await contract.getPatient(address);
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
  } catch { return null; }
};

export const getDoctorProfile = async (address) => {
  try {
    const contract = await getReadContract("DoctorRegistry");
    const data = await contract.getDoctor(address);
    return {
      walletAddress: data.walletAddress,
      specialization: data.specialization,
      licenseNumber: data.licenseNumber,
      status: Number(data.status),
      isVerified: data.isVerified,
      totalPatients: Number(data.totalPatients),
      registeredAt: Number(data.registeredAt),
    };
  } catch { return null; }
};

export const getPendingPatients = async () => {
  try {
    const contract = await getReadContract("PatientRegistry");
    return await contract.getPendingList();
  } catch { return []; }
};

export const getPendingDoctors = async () => {
  try {
    const contract = await getReadContract("DoctorRegistry");
    return await contract.getPendingList();
  } catch { return []; }
};

// ==========================================
//  DOCTOR ACTIONS (Admin signs via MetaMask)
// ==========================================

export const verifyDoctorOnChain = async (doctorAddress) => {
  const contract = await getSignedContract("DoctorRegistry");
  console.log(`📤 Verifying doctor on-chain: ${doctorAddress}`);
  const tx = await contract.verifyDoctor(doctorAddress);
  console.log(`⏳ Waiting... Tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Doctor verified! Block: ${receipt.blockNumber}`);
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

export const rejectDoctorOnChain = async (doctorAddress, reason) => {
  const contract = await getSignedContract("DoctorRegistry");
  const tx = await contract.rejectDoctor(doctorAddress, reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

export const suspendDoctorOnChain = async (doctorAddress, reason) => {
  const contract = await getSignedContract("DoctorRegistry");
  const tx = await contract.suspendDoctor(doctorAddress, reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

export const reinstateDoctorOnChain = async (doctorAddress) => {
  const contract = await getSignedContract("DoctorRegistry");
  const tx = await contract.reinstateDoctor(doctorAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

// Grant DOCTOR_ROLE via MedChainCore
export const grantDoctorRole = async (doctorAddress) => {
  const contract = await getSignedContract("MedChainCore");
  const tx = await contract.grantDoctorRole(doctorAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

export const revokeDoctorRole = async (doctorAddress) => {
  const contract = await getSignedContract("MedChainCore");
  const tx = await contract.revokeDoctorRole(doctorAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

// ==========================================
//  PATIENT ACTIONS (Admin signs via MetaMask)
// ==========================================

export const approvePatientOnChain = async (patientAddress) => {
  const contract = await getSignedContract("PatientRegistry");
  console.log(`📤 Approving patient: ${patientAddress}`);
  const tx = await contract.approveRegistration(patientAddress);
  const receipt = await tx.wait();
  console.log(`✅ Patient approved! Block: ${receipt.blockNumber}`);
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

export const rejectPatientOnChain = async (patientAddress, reason) => {
  const contract = await getSignedContract("PatientRegistry");
  const tx = await contract.rejectRegistration(patientAddress, reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

// Grant PATIENT_ROLE via MedChainCore
export const grantPatientRole = async (patientAddress) => {
  const contract = await getSignedContract("MedChainCore");
  const tx = await contract.grantPatientRole(patientAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: Number(receipt.blockNumber) };
};

// ==========================================
//  PLATFORM ACTIONS (Admin)
// ==========================================

export const pausePlatform = async (reason) => {
  const contract = await getSignedContract("MedChainCore");
  const tx = await contract.pausePlatform(reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
};

export const unpausePlatform = async () => {
  const contract = await getSignedContract("MedChainCore");
  const tx = await contract.unpausePlatform();
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
};

// ==========================================
//  STATUS MAPS
// ==========================================

export const PATIENT_STATUS = { 0: "None", 1: "Pending", 2: "Approved", 3: "Rejected", 4: "Active", 5: "Deactivated" };
export const DOCTOR_STATUS = { 0: "None", 1: "Pending", 2: "Verified", 3: "Rejected", 4: "Suspended" };