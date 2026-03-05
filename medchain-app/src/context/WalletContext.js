import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WalletContext = createContext();
export const useWalletContext = () => useContext(WalletContext);

const WALLET_PK_KEY = "wallet_private_key";

export function WalletProvider({ children }) {
  const [privateKey, setPrivateKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKey();
  }, []);

  const loadKey = async () => {
    try {
      const pk = await AsyncStorage.getItem(WALLET_PK_KEY);
      if (pk) setPrivateKey(pk);
    } catch {}
    setLoading(false);
  };

  const savePrivateKey = async (pk) => {
    await AsyncStorage.setItem(WALLET_PK_KEY, pk);
    setPrivateKey(pk);
  };

  const clearPrivateKey = async () => {
    await AsyncStorage.removeItem(WALLET_PK_KEY);
    setPrivateKey(null);
  };

  return (
    <WalletContext.Provider value={{ privateKey, loading, savePrivateKey, clearPrivateKey, hasWallet: !!privateKey }}>
      {children}
    </WalletContext.Provider>
  );
}