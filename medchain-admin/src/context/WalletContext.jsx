import { createContext, useContext, useState, useEffect } from "react";
import { connectMetaMask, formatAddress } from "../services/blockchain";

const WalletContext = createContext();
export const useWallet = () => useContext(WalletContext);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) setWallet(null);
        else setWallet(prev => prev ? { ...prev, address: accounts[0] } : null);
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  const connect = async () => {
    setConnecting(true);
    setError("");
    try {
      const result = await connectMetaMask();
      if (!result.isCorrectNetwork) {
        throw new Error("Please switch to Sepolia network");
      }
      setWallet(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => setWallet(null);

  return (
    <WalletContext.Provider value={{
      wallet, connecting, error, connect, disconnect,
      address: wallet?.address,
      isConnected: !!wallet,
      formatted: formatAddress(wallet?.address),
    }}>
      {children}
    </WalletContext.Provider>
  );
}