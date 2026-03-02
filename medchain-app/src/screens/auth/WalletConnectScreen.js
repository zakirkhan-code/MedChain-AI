import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import { Button, Input, Card } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function WalletConnectScreen({ navigation }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [message] = useState("Login to MedChain AI");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();

  const handleWalletLogin = async () => {
    if (!walletAddress || !signature) return Alert.alert("Error", "Enter wallet address and signature");
    if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) return Alert.alert("Error", "Invalid wallet address");

    setLoading(true);
    try {
      const res = await authAPI.walletLogin({
        walletAddress: walletAddress.trim().toLowerCase(),
        message,
        signature: signature.trim(),
      });
      await AsyncStorage.setItem("token", res.data.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(res.data.data.user));
      updateUser(res.data.data.user);
      Alert.alert("Success", "Wallet connected and logged in!");
    } catch (err) {
      Alert.alert("Failed", err.response?.data?.message || "Wallet login failed");
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="wallet" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Connect Wallet</Text>
          <Text style={styles.subtitle}>Login with your MetaMask wallet</Text>
        </View>

        <Card>
          <Text style={styles.stepTitle}>Step 1: Copy this message</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
          <Text style={styles.hint}>Copy this exact message to sign in MetaMask</Text>
        </Card>

        <Card>
          <Text style={styles.stepTitle}>Step 2: Sign in MetaMask</Text>
          <Text style={styles.stepDesc}>
            Open MetaMask browser → Console → Run:{"\n\n"}
            <Text style={styles.code}>
              await ethereum.request({"{"}{"\n"}
              {"  "}method: 'personal_sign',{"\n"}
              {"  "}params: ['{message}', YOUR_ADDRESS]{"\n"}
              {"}"})
            </Text>
          </Text>
        </Card>

        <Card>
          <Text style={styles.stepTitle}>Step 3: Paste details</Text>

          <Input
            label="Wallet Address"
            icon="wallet-outline"
            placeholder="0x..."
            value={walletAddress}
            onChangeText={setWalletAddress}
            autoCapitalize="none"
          />

          <Input
            label="Signature"
            icon="key-outline"
            placeholder="0x..."
            value={signature}
            onChangeText={setSignature}
            autoCapitalize="none"
            multiline
          />

          <Button title="Login with Wallet" onPress={handleWalletLogin} loading={loading} icon="log-in-outline" />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 20, paddingTop: 10 },
  iconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primary + "15", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: SIZES.xxl, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, marginTop: 4 },
  stepTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  stepDesc: { fontSize: SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  messageBox: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 8, marginBottom: 6 },
  messageText: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.primary, textAlign: "center" },
  hint: { fontSize: SIZES.xs, color: COLORS.textLight },
  code: { fontFamily: "monospace", fontSize: SIZES.xs, color: COLORS.text },
});