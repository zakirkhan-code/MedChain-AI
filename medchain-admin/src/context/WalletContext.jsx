import { createContext, useContext, useState, useEffect } from "react";
import { connectMetaMask, switchToSepolia, listenAccountChanges, formatAddress } from "../services/wallet";

const WalletContext = createContext();
export const useWallet = () => useContext(WalletContext);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listenAccountChanges((accounts) => {
      if (accounts.length === 0) setWallet(null);
      else setWallet((prev) => prev ? { ...prev, address: accounts[0] } : null);
    });
  }, []);

  const connect = async () => {
    setConnecting(true);
    setError("");
    try {
      await switchToSepolia();
      const result = await connectMetaMask();
      if (result.chainId !== 11155111) {
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

  const disconnect = () => {
    setWallet(null);
  };

  return (
    <WalletContext.Provider value={{
      wallet, connecting, error, connect, disconnect,
      address: wallet?.address, signer: wallet?.signer, provider: wallet?.provider,
      isConnected: !!wallet, formatted: formatAddress(wallet?.address),
    }}>
      {children}
    </WalletContext.Provider>
  );
}