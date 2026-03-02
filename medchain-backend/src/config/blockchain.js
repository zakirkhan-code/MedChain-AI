const { ethers } = require("ethers");
const abis = require("./abis.json");

const PROVIDER = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const WALLET = new ethers.Wallet(process.env.PRIVATE_KEY, PROVIDER);

const contracts = {};

const getContract = (name) => {
  const addressKey = {
    MedChainCore: "MEDCHAIN_CORE_ADDRESS",
    PatientRegistry: "PATIENT_REGISTRY_ADDRESS",
    DoctorRegistry: "DOCTOR_REGISTRY_ADDRESS",
    RecordManager: "RECORD_MANAGER_ADDRESS",
    MedChainAccessControl: "ACCESS_CONTROL_ADDRESS",
    ConsentLedger: "CONSENT_LEDGER_ADDRESS",
  };

  if (!contracts[name]) {
    const address = process.env[addressKey[name]];
    if (!address || !abis[name]) {
      console.warn(`Contract ${name} not configured`);
      return null;
    }
    contracts[name] = new ethers.Contract(address, abis[name], WALLET);
  }
  return contracts[name];
};

module.exports = {
  provider: PROVIDER,
  wallet: WALLET,
  getContract,
  core: () => getContract("MedChainCore"),
  patientRegistry: () => getContract("PatientRegistry"),
  doctorRegistry: () => getContract("DoctorRegistry"),
  recordManager: () => getContract("RecordManager"),
  accessControl: () => getContract("MedChainAccessControl"),
  consentLedger: () => getContract("ConsentLedger"),
};