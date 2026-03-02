const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const verifyTransaction = async (txHash, expectedFrom, expectedTo) => {
  const tx = await provider.getTransaction(txHash);
  if (!tx) throw new Error("Transaction not found");

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error("Transaction not confirmed yet");
  if (receipt.status !== 1) throw new Error("Transaction failed on-chain");

  if (expectedFrom && tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
    throw new Error("Transaction sender mismatch");
  }

  if (expectedTo && tx.to.toLowerCase() !== expectedTo.toLowerCase()) {
    throw new Error("Transaction target mismatch");
  }

  return {
    txHash: tx.hash,
    from: tx.from,
    to: tx.to,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    status: "confirmed",
    logs: receipt.logs,
  };
};

const waitForTx = async (txHash, confirmations = 1) => {
  const tx = await provider.getTransaction(txHash);
  if (!tx) throw new Error("Transaction not found");
  const receipt = await tx.wait(confirmations);
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status === 1 ? "confirmed" : "failed",
  };
};

const decodeEventLogs = (receipt, contractInterface) => {
  const events = [];
  for (const log of receipt.logs) {
    try {
      const parsed = contractInterface.parseLog({ topics: log.topics, data: log.data });
      if (parsed) events.push({ name: parsed.name, args: parsed.args });
    } catch {}
  }
  return events;
};

module.exports = { verifyTransaction, waitForTx, decodeEventLogs };