import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { Button, Input } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function LoginScreen({ navigation }) {
  const [cnic, setCnic] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const formatCnic = (text) => {
    const nums = text.replace(/[^0-9]/g, "").slice(0, 13);
    if (nums.length <= 5) return nums;
    if (nums.length <= 12) return `${nums.slice(0, 5)}-${nums.slice(5)}`;
    return `${nums.slice(0, 5)}-${nums.slice(5, 12)}-${nums.slice(12)}`;
  };

  const handleLogin = async () => {
    if (!cnic || !walletAddress || !password) return Alert.alert("Error", "Please fill all fields");
    if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) return Alert.alert("Error", "Invalid wallet address");

    setLoading(true);
    try {
      await login(cnic.trim(), password, walletAddress.trim().toLowerCase());
    } catch (err) {
      Alert.alert("Login Failed", err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="pulse" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.title}>MedChain AI</Text>
          <Text style={styles.subtitle}>AI-Powered Healthcare on Blockchain</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in with CNIC & Wallet</Text>

          <Input label="CNIC *" icon="card-outline" placeholder="XXXXX-XXXXXXX-X" value={cnic} onChangeText={(t) => setCnic(formatCnic(t))} keyboardType="numeric" maxLength={15} />

          <Input label="Wallet Address *" icon="wallet-outline" placeholder="0x..." value={walletAddress} onChangeText={setWalletAddress} autoCapitalize="none" />

          <Input label="Password *" icon="lock-closed-outline" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />

          <Button title="Sign In" onPress={handleLogin} loading={loading} style={{ marginTop: 8 }} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Text style={styles.footerLink} onPress={() => navigation.navigate("Register")}>Sign Up</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1 },
  header: { alignItems: "center", paddingTop: 80, paddingBottom: 40 },
  logoBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.white },
  subtitle: { fontSize: SIZES.md, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  form: { flex: 1, backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 32 },
  formTitle: { fontSize: SIZES.xxl, fontWeight: "700", color: COLORS.text },
  formSubtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, marginBottom: 28 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: SIZES.md, color: COLORS.textSecondary },
  footerLink: { fontSize: SIZES.md, color: COLORS.primary, fontWeight: "600" },
});