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

const getSigner = async () => {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  const provider = new ethers.BrowserProvider(window.ethereum);
  return await provider.getSigner();
};

const getSignedContract = async (name) => {
  const signer = await getSigner();
  return new ethers.Contract(ADDRESSES[name], abis[name], signer);
};

const getReadContract = async (name) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  return new ethers.Contract(ADDRESSES[name], abis[name], provider);
};

// ============ READ FUNCTIONS ============

export const getPlatformStats = async () => {
  const core = await getReadContract("MedChainCore");
  const stats = await core.getPlatformStats();
  return {
    totalUsers: Number(stats[0]),
    totalRecords: Number(stats[1]),
    totalConsents: Number(stats[2]),
    isPaused: stats[3],
  };
};

export const getPatientOnChain = async (address) => {
  const registry = await getReadContract("PatientRegistry");
  return await registry.getPatient(address);
};

export const getDoctorOnChain = async (address) => {
  const registry = await getReadContract("DoctorRegistry");
  return await registry.getDoctor(address);
};

export const getRecordOnChain = async (recordId) => {
  const manager = await getReadContract("RecordManager");
  return await manager.getRecord(recordId);
};

export const getConsentHistory = async (patientAddress) => {
  const ledger = await getReadContract("ConsentLedger");
  return await ledger.getPatientHistory(patientAddress);
};

// ============ WRITE FUNCTIONS (MetaMask Signs) ============

export const verifyDoctorOnChain = async (doctorAddress) => {
  const registry = await getSignedContract("DoctorRegistry");
  const tx = await registry.verifyDoctor(doctorAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

export const rejectDoctorOnChain = async (doctorAddress, reason) => {
  const registry = await getSignedContract("DoctorRegistry");
  const tx = await registry.rejectDoctor(doctorAddress, reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

export const suspendDoctorOnChain = async (doctorAddress, reason) => {
  const registry = await getSignedContract("DoctorRegistry");
  const tx = await registry.suspendDoctor(doctorAddress, reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

export const approvePatientOnChain = async (patientAddress) => {
  const registry = await getSignedContract("PatientRegistry");
  const tx = await registry.approveRegistration(patientAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

export const rejectPatientOnChain = async (patientAddress, reason) => {
  const registry = await getSignedContract("PatientRegistry");
  const tx = await registry.rejectRegistration(patientAddress, reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
};

export const pausePlatform = async (reason) => {
  const core = await getSignedContract("MedChainCore");
  const tx = await core.pause(reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
};

export const unpausePlatform = async (reason) => {
  const core = await getSignedContract("MedChainCore");
  const tx = await core.unpause(reason);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
};