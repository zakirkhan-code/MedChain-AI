import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { WalletProvider } from "./src/context/WalletContext";
import RootNavigation from "./src/navigation/RootNavigation";

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <StatusBar style="light" />
        <RootNavigation />
      </WalletProvider>
    </AuthProvider>
  );
}