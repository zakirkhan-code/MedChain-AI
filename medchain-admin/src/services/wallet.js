import { ethers } from "ethers";

export const connectMetaMask = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed. Please install MetaMask extension.");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const address = accounts[0];

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return { address, provider, signer, chainId: Number(network.chainId) };
};

export const signMessage = async (message) => {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, accounts[0]],
  });

  return { address: accounts[0], signature, message };
};

export const switchToSepolia = async () => {
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
};

export const getContract = (address, abi, signer) => {
  return new ethers.Contract(address, abi, signer);
};

export const listenAccountChanges = (callback) => {
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", callback);
    window.ethereum.on("chainChanged", () => window.location.reload());
  }
};

export const formatAddress = (addr) => {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};