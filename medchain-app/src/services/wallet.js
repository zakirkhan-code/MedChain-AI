import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "./api";

const WALLET_KEY = "connected_wallet";

export const walletLogin = async (walletAddress, signature, message) => {
  const res = await authAPI.walletLogin({ walletAddress, message, signature });
  const { user, token } = res.data.data;
  await AsyncStorage.setItem("token", token);
  await AsyncStorage.setItem("user", JSON.stringify(user));
  return user;
};

export const connectWallet = async (walletAddress, signature, message) => {
  const res = await authAPI.connectWallet({ walletAddress, message, signature });
  return res.data;
};

export const saveWalletAddress = async (address) => {
  await AsyncStorage.setItem(WALLET_KEY, address);
};

export const getSavedWallet = async () => {
  return await AsyncStorage.getItem(WALLET_KEY);
};

export const clearWallet = async () => {
  await AsyncStorage.removeItem(WALLET_KEY);
};

export const formatAddress = (addr) => {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};