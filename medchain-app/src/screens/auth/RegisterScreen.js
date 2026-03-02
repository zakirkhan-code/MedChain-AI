import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { Button, Input } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [role, setRole] = useState("patient");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const formatCnic = (text) => {
    const nums = text.replace(/[^0-9]/g, "").slice(0, 13);
    if (nums.length <= 5) return nums;
    if (nums.length <= 12) return `${nums.slice(0, 5)}-${nums.slice(5)}`;
    return `${nums.slice(0, 5)}-${nums.slice(5, 12)}-${nums.slice(12)}`;
  };

  const handleRegister = async () => {
    if (!name || !cnic || !password) return Alert.alert("Error", "Name, CNIC and Password are required");
    if (cnic.replace(/[^0-9]/g, "").length !== 13) return Alert.alert("Error", "CNIC must be 13 digits (XXXXX-XXXXXXX-X)");
    if (!walletAddress) return Alert.alert("Error", "Wallet address is required");
    if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) return Alert.alert("Error", "Invalid wallet address");
    if (password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        cnic: cnic.trim(),
        password,
        phone,
        role,
        walletAddress: walletAddress.trim().toLowerCase(),
      };
      if (email.trim()) data.email = email.trim().toLowerCase();
      await register(data);
    } catch (err) {
      Alert.alert("Registration Failed", err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join MedChain AI Platform</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            {[{ key: "patient", icon: "person", label: "Patient" }, { key: "doctor", icon: "medkit", label: "Doctor" }].map((r) => (
              <TouchableOpacity key={r.key} onPress={() => setRole(r.key)}
                style={[styles.roleCard, role === r.key && styles.roleCardActive]} activeOpacity={0.8}>
                <Ionicons name={r.icon} size={24} color={role === r.key ? COLORS.white : COLORS.primary} />
                <Text style={[styles.roleLabel, role === r.key && { color: COLORS.white }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Full Name *" icon="person-outline" placeholder="Your full name" value={name} onChangeText={setName} />

          <Input label="CNIC *" icon="card-outline" placeholder="XXXXX-XXXXXXX-X" value={cnic} onChangeText={(t) => setCnic(formatCnic(t))} keyboardType="numeric" maxLength={15} />

          <Input label="Wallet Address *" icon="wallet-outline" placeholder="0x..." value={walletAddress} onChangeText={setWalletAddress} autoCapitalize="none" />

          <Input label="Email (Optional)" icon="mail-outline" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <Input label="Phone" icon="call-outline" placeholder="+923001234567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Input label="Password *" icon="lock-closed-outline" placeholder="Min 6 characters" value={password} onChangeText={setPassword} secureTextEntry />

          <Button title="Create Account" onPress={handleRegister} loading={loading} style={{ marginTop: 8 }} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text style={styles.footerLink} onPress={() => navigation.goBack()}>Sign In</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1 },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 24 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: SIZES.xxl, fontWeight: "800", color: COLORS.white },
  subtitle: { fontSize: SIZES.md, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  form: { flex: 1, backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 28 },
  label: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  roleCard: { flex: 1, height: 80, borderRadius: SIZES.radius, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", gap: 6 },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  roleLabel: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.text },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24, paddingBottom: 32 },
  footerText: { fontSize: SIZES.md, color: COLORS.textSecondary },
  footerLink: { fontSize: SIZES.md, color: COLORS.primary, fontWeight: "600" },
});