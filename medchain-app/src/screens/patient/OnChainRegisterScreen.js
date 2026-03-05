import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useWalletContext } from "../../context/WalletContext";
import { patientSubmitRegistration, patientGiveConsent, getPatientStatus, STATUS_MAP } from "../../services/blockchain";
import { Button, Card, Badge, Input } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function OnChainRegisterScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { privateKey, savePrivateKey, hasWallet } = useWalletContext();
  const [pkInput, setPkInput] = useState("");
  const [status, setStatus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("check"); // check, enter_pk, register, approved, active

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (!user?.walletAddress) {
      setStep("no_wallet");
      return;
    }
    const s = await getPatientStatus(user.walletAddress);
    setStatus(s);

    if (!hasWallet && s === 0) setStep("enter_pk");
    else if (s === 0) setStep("register");
    else if (s === 1) setStep("pending");
    else if (s === 2) setStep("approved");
    else if (s === 4) setStep("active");
    else if (s === 3) setStep("rejected");
    else setStep("register");
  };

  const handleSaveKey = () => {
    if (!pkInput.trim() || pkInput.trim().length < 64) {
      return Alert.alert("Error", "Enter valid private key (64 hex characters)");
    }
    const key = pkInput.trim().startsWith("0x") ? pkInput.trim() : "0x" + pkInput.trim();
    savePrivateKey(key);
    setStep("register");
  };

  const handleRegister = async () => {
    if (!privateKey) return Alert.alert("Error", "Private key not set");
    setLoading(true);
    try {
      const result = await patientSubmitRegistration(
        privateKey,
        { name: user.name, cnic: user.cnic, phone: user.phone },
        user.bloodType || "",
        user.allergies || ""
      );

      if (result.success) {
        Alert.alert("Success! 🎉", `Registration submitted on blockchain!\n\nTx: ${result.txHash.slice(0, 20)}...\n\nWait for admin approval.`);
        updateUser({ onChainStatus: 1 });
        setStatus(1);
        setStep("pending");

        // Notify backend
        try {
          const { default: API } = await import("../../services/api");
          await API.post("/patients/confirm-onchain", { txHash: result.txHash });
        } catch {}
      } else {
        Alert.alert("Failed", result.message);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  const handleConsent = async () => {
    if (!privateKey) return Alert.alert("Error", "Private key not set");
    setLoading(true);
    try {
      const result = await patientGiveConsent(privateKey);
      if (result.success) {
        Alert.alert("Welcome! 🎉", "You are now an Active patient on the blockchain!");
        updateUser({ onChainStatus: 4 });
        setStatus(4);
        setStep("active");

        try {
          const { default: API } = await import("../../services/api");
          await API.post("/patients/confirm-consent", { txHash: result.txHash });
        } catch {}
      } else {
        Alert.alert("Failed", result.message);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  const statusLabel = STATUS_MAP.patient[status] || "Unknown";
  const statusColor = { 0: "warning", 1: "info", 2: "info", 3: "danger", 4: "success", 5: "danger" };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Blockchain Registration</Text>
          <Text style={styles.subtitle}>Register on Sepolia Testnet</Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.label}>On-Chain Status:</Text>
            <Badge label={statusLabel} variant={statusColor[status] || "default"} />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Wallet:</Text>
            <Text style={styles.walletText}>{user?.walletAddress ? `${user.walletAddress.slice(0, 10)}...${user.walletAddress.slice(-6)}` : "Not set"}</Text>
          </View>
        </Card>

        {step === "no_wallet" && (
          <Card>
            <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
            <Text style={styles.infoText}>You don't have a wallet address. Go to Edit Profile and add your wallet address first.</Text>
            <Button title="Go to Profile" onPress={() => navigation.navigate("EditProfile")} variant="outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {step === "enter_pk" && (
          <Card>
            <Text style={styles.sectionTitle}>Step 1: Enter Private Key</Text>
            <Text style={styles.infoText}>Your private key is needed to sign blockchain transactions. It stays on your device only.</Text>
            <Text style={styles.warningText}>⚠️ Never share your private key with anyone!</Text>
            <Input
              label="Private Key"
              icon="key-outline"
              placeholder="Enter your MetaMask private key"
              value={pkInput}
              onChangeText={setPkInput}
              autoCapitalize="none"
              secureTextEntry
            />
            <Button title="Save & Continue" onPress={handleSaveKey} icon="checkmark-circle-outline" />
          </Card>
        )}

        {step === "register" && (
          <Card>
            <Text style={styles.sectionTitle}>Step 2: Submit Registration</Text>
            <Text style={styles.infoText}>This will send a transaction to the PatientRegistry contract on Sepolia testnet. Your profile data hash will be stored on-chain.</Text>
            <View style={styles.dataPreview}>
              <Text style={styles.previewLabel}>Name: {user?.name}</Text>
              <Text style={styles.previewLabel}>CNIC: {user?.cnic}</Text>
              <Text style={styles.previewLabel}>Blood Type: {user?.bloodType || "Not set"}</Text>
            </View>
            <Button title="Submit Registration (On-Chain)" onPress={handleRegister} loading={loading} icon="cloud-upload-outline" style={{ marginTop: 12 }} />
            <Text style={styles.gasNote}>💡 Requires Sepolia ETH for gas fees</Text>
          </Card>
        )}

        {step === "pending" && (
          <Card>
            <Ionicons name="time" size={32} color={COLORS.info} style={{ alignSelf: "center" }} />
            <Text style={styles.pendingTitle}>Registration Pending</Text>
            <Text style={styles.infoText}>Your registration is submitted on blockchain. Please wait for admin approval.</Text>
            <Button title="Refresh Status" onPress={checkStatus} variant="outline" icon="refresh-outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {step === "approved" && (
          <Card>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.success} style={{ alignSelf: "center" }} />
            <Text style={styles.approvedTitle}>Registration Approved! 🎉</Text>
            <Text style={styles.infoText}>Admin has approved your registration. Now give your consent to activate your account.</Text>
            <Button title="Give Consent & Activate" onPress={handleConsent} loading={loading} icon="hand-left-outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {step === "active" && (
          <Card>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.success} style={{ alignSelf: "center" }} />
            <Text style={styles.activeTitle}>Account Active on Blockchain! ✅</Text>
            <Text style={styles.infoText}>You are fully registered on Sepolia blockchain. You can now create records, grant access, and use all features.</Text>
          </Card>
        )}

        {step === "rejected" && (
          <Card>
            <Ionicons name="close-circle" size={32} color={COLORS.danger} style={{ alignSelf: "center" }} />
            <Text style={styles.rejectedTitle}>Registration Rejected</Text>
            <Text style={styles.infoText}>Your registration was rejected. You can re-submit with updated information.</Text>
            <Button title="Re-Submit Registration" onPress={() => setStep("register")} variant="outline" icon="refresh-outline" style={{ marginTop: 12 }} />
          </Card>
        )}
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
  sectionTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: SIZES.md, color: COLORS.textSecondary },
  walletText: { fontSize: SIZES.sm, color: COLORS.text, fontFamily: "monospace" },
  infoText: { fontSize: SIZES.md, color: COLORS.textSecondary, lineHeight: 22, marginTop: 8 },
  warningText: { fontSize: SIZES.sm, color: COLORS.warning, marginVertical: 8, fontWeight: "600" },
  dataPreview: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 8, marginTop: 8 },
  previewLabel: { fontSize: SIZES.sm, color: COLORS.text, marginBottom: 4 },
  gasNote: { fontSize: SIZES.xs, color: COLORS.textLight, textAlign: "center", marginTop: 8 },
  pendingTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.info, textAlign: "center", marginTop: 8 },
  approvedTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.success, textAlign: "center", marginTop: 8 },
  activeTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.success, textAlign: "center", marginTop: 8 },
  rejectedTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.danger, textAlign: "center", marginTop: 8 },
});