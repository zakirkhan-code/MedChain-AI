const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("========================================");
  console.log("  MedChain AI v2 - Deployment");
  console.log("========================================");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network:  ${hre.network.name}`);
  console.log(`Balance:  ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH\n`);

  console.log("1/6 Deploying MedChainCore...");
  const Core = await hre.ethers.getContractFactory("MedChainCore");
  const core = await Core.deploy();
  await core.waitForDeployment();
  const coreAddr = await core.getAddress();
  console.log(`    MedChainCore: ${coreAddr}\n`);

  console.log("2/6 Deploying PatientRegistry...");
  const PR = await hre.ethers.getContractFactory("PatientRegistry");
  const pr = await PR.deploy(coreAddr);
  await pr.waitForDeployment();
  const prAddr = await pr.getAddress();
  console.log(`    PatientRegistry: ${prAddr}\n`);

  console.log("3/6 Deploying DoctorRegistry...");
  const DR = await hre.ethers.getContractFactory("DoctorRegistry");
  const dr = await DR.deploy(coreAddr);
  await dr.waitForDeployment();
  const drAddr = await dr.getAddress();
  console.log(`    DoctorRegistry: ${drAddr}\n`);

  console.log("4/6 Deploying RecordManager...");
  const RM = await hre.ethers.getContractFactory("RecordManager");
  const rm = await RM.deploy(coreAddr);
  await rm.waitForDeployment();
  const rmAddr = await rm.getAddress();
  console.log(`    RecordManager: ${rmAddr}\n`);

  console.log("5/6 Deploying MedChainAccessControl...");
  const AC = await hre.ethers.getContractFactory("MedChainAccessControl");
  const ac = await AC.deploy(coreAddr);
  await ac.waitForDeployment();
  const acAddr = await ac.getAddress();
  console.log(`    MedChainAccessControl: ${acAddr}\n`);

  console.log("6/6 Deploying ConsentLedger...");
  const CL = await hre.ethers.getContractFactory("ConsentLedger");
  const cl = await CL.deploy(coreAddr);
  await cl.waitForDeployment();
  const clAddr = await cl.getAddress();
  console.log(`    ConsentLedger: ${clAddr}\n`);

  console.log("Registering contracts...");
  await core.registerContract("PatientRegistry", prAddr);
  await core.registerContract("DoctorRegistry", drAddr);
  await core.registerContract("RecordManager", rmAddr);
  await core.registerContract("AccessControl", acAddr);
  await core.registerContract("ConsentLedger", clAddr);
  console.log("All contracts registered!\n");

  console.log("========================================");
  console.log("  DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log(`  MedChainCore:          ${coreAddr}`);
  console.log(`  PatientRegistry:       ${prAddr}`);
  console.log(`  DoctorRegistry:        ${drAddr}`);
  console.log(`  RecordManager:         ${rmAddr}`);
  console.log(`  MedChainAccessControl: ${acAddr}`);
  console.log(`  ConsentLedger:         ${clAddr}`);
  console.log("========================================\n");

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting 30s for verification...");
    await new Promise((r) => setTimeout(r, 30000));

    const contracts = [
      { name: "MedChainCore", address: coreAddr, args: [] },
      { name: "PatientRegistry", address: prAddr, args: [coreAddr] },
      { name: "DoctorRegistry", address: drAddr, args: [coreAddr] },
      { name: "RecordManager", address: rmAddr, args: [coreAddr] },
      { name: "MedChainAccessControl", address: acAddr, args: [coreAddr] },
      { name: "ConsentLedger", address: clAddr, args: [coreAddr] },
    ];

    for (const c of contracts) {
      try {
        await hre.run("verify:verify", { address: c.address, constructorArguments: c.args });
        console.log(`Verified ${c.name}`);
      } catch (e) {
        console.log(`${c.name} verification: ${e.message}`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
