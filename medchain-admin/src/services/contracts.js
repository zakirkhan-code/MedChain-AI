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

export const getContract = (name, signerOrProvider) => {
  if (!ADDRESSES[name] || !abis[name]) throw new Error(`Contract ${name} not found`);
  return new ethers.Contract(ADDRESSES[name], abis[name], signerOrProvider);
};

export const getReadOnlyContract = async (name) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  return getContract(name, provider);
};

export const getSignedContract = async (name) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return getContract(name, signer);
};