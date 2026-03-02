const { ethers } = require("ethers");
const { getContracts, getProvider } = require("../config/blockchain");

const hashData = (data) => ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));

const waitForTx = async (tx) => {
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
};

const submitPatientRegistration = async (walletAddress, profileHash, encryptedURI, bloodType, allergies) => {
  const { patientRegistry } = getContracts();
  const tx = await patientRegistry.submitRegistration(profileHash, encryptedURI, bloodType, allergies);
  return waitForTx(tx);
};

const approvePatientOnChain = async (walletAddress) => {
  const { patientRegistry } = getContracts();
  const tx = await patientRegistry.approveRegistration(walletAddress);
  return waitForTx(tx);
};

const rejectPatientOnChain = async (walletAddress, reason) => {
  const { patientRegistry } = getContracts();
  const tx = await patientRegistry.rejectRegistration(walletAddress, reason);
  return waitForTx(tx);
};

const getPatientOnChain = async (walletAddress) => {
  const { patientRegistry } = getContracts();
  return await patientRegistry.getPatient(walletAddress);
};

const getPatientStatusOnChain = async (walletAddress) => {
  const { patientRegistry } = getContracts();
  return await patientRegistry.getPatientStatus(walletAddress);
};

const submitDoctorApplication = async (credHash, encryptedURI, specialization, license, docURI) => {
  const { doctorRegistry } = getContracts();
  const tx = await doctorRegistry.submitApplication(credHash, encryptedURI, specialization, license, docURI);
  return waitForTx(tx);
};

const verifyDoctorOnChain = async (walletAddress) => {
  const { doctorRegistry } = getContracts();
  const tx = await doctorRegistry.verifyDoctor(walletAddress);
  return waitForTx(tx);
};

const rejectDoctorOnChain = async (walletAddress, reason) => {
  const { doctorRegistry } = getContracts();
  const tx = await doctorRegistry.rejectDoctor(walletAddress, reason);
  return waitForTx(tx);
};

const suspendDoctorOnChain = async (walletAddress, reason) => {
  const { doctorRegistry } = getContracts();
  const tx = await doctorRegistry.suspendDoctor(walletAddress, reason);
  return waitForTx(tx);
};

const createRecordOnChain = async (patientWallet, contentHash, ipfsURI, encKeyHash, recordType, description) => {
  const { recordManager } = getContracts();
  const tx = await recordManager.createRecord(patientWallet, contentHash, ipfsURI, encKeyHash, recordType, description);
  return waitForTx(tx);
};

const amendRecordOnChain = async (recordId, newHash, newIpfsURI, reason) => {
  const { recordManager } = getContracts();
  const tx = await recordManager.amendRecord(recordId, newHash, newIpfsURI, reason);
  return waitForTx(tx);
};

const verifyRecordOnChain = async (recordId, contentHash) => {
  const { recordManager } = getContracts();
  return await recordManager.verifyRecord(recordId, contentHash);
};

const grantAccessOnChain = async (providerWallet, level, duration, allowedTypes, purpose) => {
  const { accessControl } = getContracts();
  const tx = await accessControl.grantAccess(providerWallet, level, duration, allowedTypes, purpose);
  return waitForTx(tx);
};

const revokeAccessOnChain = async (providerWallet) => {
  const { accessControl } = getContracts();
  const tx = await accessControl.revokeAccess(providerWallet);
  return waitForTx(tx);
};

const requestAccessOnChain = async (patientWallet, level, types, reason, duration) => {
  const { accessControl } = getContracts();
  const tx = await accessControl.requestAccess(patientWallet, level, types, reason, duration);
  return waitForTx(tx);
};

const approveAccessRequestOnChain = async (requestId) => {
  const { accessControl } = getContracts();
  const tx = await accessControl.approveRequest(requestId);
  return waitForTx(tx);
};

const rejectAccessRequestOnChain = async (requestId) => {
  const { accessControl } = getContracts();
  const tx = await accessControl.rejectRequest(requestId);
  return waitForTx(tx);
};

const grantEmergencyAccessOnChain = async (patientWallet, providerWallet) => {
  const { accessControl } = getContracts();
  const tx = await accessControl.grantEmergencyAccess(patientWallet, providerWallet);
  return waitForTx(tx);
};

const checkAccessOnChain = async (patientWallet, providerWallet) => {
  const { accessControl } = getContracts();
  return await accessControl.checkAccess(patientWallet, providerWallet);
};

const getPlatformStats = async () => {
  const { core } = getContracts();
  const stats = await core.getPlatformStats();
  return {
    totalPatients: Number(stats[0]),
    totalDoctors: Number(stats[1]),
    totalRecords: Number(stats[2]),
    launchTime: Number(stats[3]),
    isPaused: stats[4],
  };
};

const getConsentHistory = async (patientWallet, offset, limit) => {
  const { consentLedger } = getContracts();
  return await consentLedger.getConsentHistory(patientWallet, offset, limit);
};

const verifyConsentOnChain = async (patientWallet, providerWallet, timestamp) => {
  const { consentLedger } = getContracts();
  return await consentLedger.verifyConsent(patientWallet, providerWallet, timestamp);
};

module.exports = {
  hashData, waitForTx,
  submitPatientRegistration, approvePatientOnChain, rejectPatientOnChain, getPatientOnChain, getPatientStatusOnChain,
  submitDoctorApplication, verifyDoctorOnChain, rejectDoctorOnChain, suspendDoctorOnChain,
  createRecordOnChain, amendRecordOnChain, verifyRecordOnChain,
  grantAccessOnChain, revokeAccessOnChain, requestAccessOnChain, approveAccessRequestOnChain, rejectAccessRequestOnChain,
  grantEmergencyAccessOnChain, checkAccessOnChain,
  getPlatformStats, getConsentHistory, verifyConsentOnChain,
};
