import { ethers } from "ethers";
import abis from "./abis.json";

export const ADDRESSES = {
  MedChainCore: "0x780A102E26D2c166e89dEECDB3508C889a58c34b",
  PatientRegistry: "0x49C33d095AdB51bC94D27982126812955179C030",
  DoctorRegistry: "0xf327c76aF61C7af390f94D2d7EeC60B0B2fa0F29",
  RecordManager: "0xd2d67800BFAd629445f78751e053d49A67Bb6Eb3",
  MedChainAccessControl: "0x9A2560C82aa726d6dE2e1F83b59268e723EF69A7",
  ConsentLedger: "0xE19f3AE604Ce7a74788EC34c34FF5717c24d5471",
};

export const getReadOnlyProvider = () => {
  return new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY");
};

export const getReadOnlyContract = (name) => {
  const provider = getReadOnlyProvider();
  return new ethers.Contract(ADDRESSES[name], abis[name], provider);
};

export const verifyRecordOnChain = async (recordId) => {
  const contract = getReadOnlyContract("RecordManager");
  const record = await contract._records(recordId);
  return {
    patient: record.patient,
    contentHash: record.contentHash,
    status: record.status,
    version: record.version,
    createdAt: Number(record.createdAt),
  };
};

export const getPatientStatus = async (patientAddress) => {
  const contract = getReadOnlyContract("PatientRegistry");
  const status = await contract.getPatientStatus(patientAddress);
  return Number(status);
};

export const getDoctorStatus = async (doctorAddress) => {
  const contract = getReadOnlyContract("DoctorRegistry");
  const status = await contract.getDoctorStatus(doctorAddress);
  return Number(status);
};

export const getPlatformStats = async () => {
  const contract = getReadOnlyContract("MedChainCore");
  const stats = await contract.getPlatformStats();
  return {
    totalUsers: Number(stats.totalUsers),
    totalRecords: Number(stats.totalRecords),
    totalConsents: Number(stats.totalConsents),
    isPaused: stats.isPaused,
  };
};