import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import { Button, Input, Card } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function ConnectWalletScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [message] = useState("Connect wallet to MedChain AI");
  const [loading, setLoading] = useState(false);

  if (user?.walletAddress) {
    return (
      <View style={styles.container}>
        <View style={styles.connected}>
          <View style={styles.checkIcon}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
          </View>
          <Text style={styles.connectedTitle}>Wallet Connected!</Text>
          <View style={styles.addressBox}>
            <Text style={styles.addressText}>{user.walletAddress}</Text>
          </View>
          <Text style={styles.hint}>Your wallet is linked to your account</Text>
        </View>
      </View>
    );
  }

  const handleConnect = async () => {
    if (!walletAddress || !signature) return Alert.alert("Error", "Fill all fields");
    if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) return Alert.alert("Error", "Invalid wallet address");

    setLoading(true);
    try {
      await authAPI.connectWallet({
        walletAddress: walletAddress.trim().toLowerCase(),
        message,
        signature: signature.trim(),
      });
      updateUser({ walletAddress: walletAddress.trim().toLowerCase() });
      Alert.alert("Success", "Wallet connected!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to connect wallet");
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Card>
          <Text style={styles.stepTitle}>Message to Sign</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        </Card>

        <Card>
          <Input label="Wallet Address" icon="wallet-outline" placeholder="0x..." value={walletAddress} onChangeText={setWalletAddress} autoCapitalize="none" />
          <Input label="Signature" icon="key-outline" placeholder="Paste signature from MetaMask" value={signature} onChangeText={setSignature} autoCapitalize="none" multiline />
          <Button title="Connect Wallet" onPress={handleConnect} loading={loading} icon="link-outline" />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },
  connected: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  checkIcon: { marginBottom: 16 },
  connectedTitle: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  addressBox: { backgroundColor: COLORS.white, padding: 14, borderRadius: 12, width: "100%" },
  addressText: { fontSize: SIZES.sm, color: COLORS.text, fontFamily: "monospace", textAlign: "center" },
  hint: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 12 },
  stepTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  messageBox: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 8 },
  messageText: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.primary, textAlign: "center" },
});