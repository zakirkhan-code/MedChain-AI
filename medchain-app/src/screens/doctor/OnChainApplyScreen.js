import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useWalletContext } from "../../context/WalletContext";
import { doctorSubmitApplication, getDoctorStatus, STATUS_MAP } from "../../services/blockchain";
import { Button, Card, Badge, Input } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function OnChainApplyScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { privateKey, savePrivateKey, hasWallet } = useWalletContext();
  const [pkInput, setPkInput] = useState("");
  const [status, setStatus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("check");

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    if (!user?.walletAddress) { setStep("no_wallet"); return; }
    const s = await getDoctorStatus(user.walletAddress);
    setStatus(s);

    if (!hasWallet && s === 0) setStep("enter_pk");
    else if (s === 0) setStep("apply");
    else if (s === 1) setStep("pending");
    else if (s === 2) setStep("verified");
    else if (s === 3) setStep("rejected");
    else if (s === 4) setStep("suspended");
    else setStep("apply");
  };

  const handleSaveKey = () => {
    if (!pkInput.trim() || pkInput.trim().length < 64) {
      return Alert.alert("Error", "Enter valid private key");
    }
    const key = pkInput.trim().startsWith("0x") ? pkInput.trim() : "0x" + pkInput.trim();
    savePrivateKey(key);
    setStep("apply");
  };

  const handleApply = async () => {
    if (!privateKey) return Alert.alert("Error", "Private key not set");
    if (!user?.specialization || !user?.licenseNumber) {
      return Alert.alert("Error", "Submit your application from profile first (specialization + license required)");
    }

    setLoading(true);
    try {
      const result = await doctorSubmitApplication(
        privateKey,
        user.credentials || "",
        user.specialization,
        user.licenseNumber
      );

      if (result.success) {
        Alert.alert("Success! 🎉", `Application submitted on blockchain!\n\nTx: ${result.txHash.slice(0, 20)}...\n\nWait for admin verification.`);
        updateUser({ onChainStatus: 1 });
        setStatus(1);
        setStep("pending");

        try {
          const { default: API } = await import("../../services/api");
          await API.post("/doctors/confirm-onchain", { txHash: result.txHash });
        } catch {}
      } else {
        Alert.alert("Failed", result.message);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  const statusLabel = STATUS_MAP.doctor[status] || "Unknown";
  const statusColor = { 0: "warning", 1: "info", 2: "success", 3: "danger", 4: "danger" };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="medkit" size={32} color={COLORS.secondary} />
          </View>
          <Text style={styles.title}>Doctor Verification</Text>
          <Text style={styles.subtitle}>Submit application on blockchain</Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.label}>On-Chain Status:</Text>
            <Badge label={statusLabel} variant={statusColor[status] || "default"} />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Specialization:</Text>
            <Text style={styles.value}>{user?.specialization || "Not set"}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.label}>License:</Text>
            <Text style={styles.value}>{user?.licenseNumber || "Not set"}</Text>
          </View>
        </Card>

        {step === "no_wallet" && (
          <Card>
            <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
            <Text style={styles.infoText}>Add your wallet address in profile first.</Text>
            <Button title="Go to Profile" onPress={() => navigation.navigate("EditProfile")} variant="outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {step === "enter_pk" && (
          <Card>
            <Text style={styles.sectionTitle}>Step 1: Enter Private Key</Text>
            <Text style={styles.warningText}>⚠️ Never share your private key!</Text>
            <Input label="Private Key" icon="key-outline" placeholder="Enter MetaMask private key" value={pkInput} onChangeText={setPkInput} autoCapitalize="none" secureTextEntry />
            <Button title="Save & Continue" onPress={handleSaveKey} icon="checkmark-circle-outline" />
          </Card>
        )}

        {step === "apply" && (
          <Card>
            <Text style={styles.sectionTitle}>Step 2: Submit On-Chain</Text>
            <Text style={styles.infoText}>This will register your credentials on the DoctorRegistry smart contract.</Text>
            <Button title="Submit Application (On-Chain)" onPress={handleApply} loading={loading} icon="cloud-upload-outline" style={{ marginTop: 12 }} />
            <Text style={styles.gasNote}>💡 Requires Sepolia ETH for gas fees</Text>
          </Card>
        )}

        {step === "pending" && (
          <Card>
            <Ionicons name="time" size={32} color={COLORS.info} style={{ alignSelf: "center" }} />
            <Text style={styles.pendingTitle}>Application Pending</Text>
            <Text style={styles.infoText}>Your application is on blockchain. Waiting for admin verification.</Text>
            <Button title="Refresh" onPress={checkStatus} variant="outline" icon="refresh-outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {step === "verified" && (
          <Card>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.success} style={{ alignSelf: "center" }} />
            <Text style={styles.verifiedTitle}>Verified Doctor! ✅</Text>
            <Text style={styles.infoText}>You are verified on blockchain. Full access to all features.</Text>
          </Card>
        )}

        {step === "rejected" && (
          <Card>
            <Ionicons name="close-circle" size={32} color={COLORS.danger} style={{ alignSelf: "center" }} />
            <Text style={styles.rejectedTitle}>Application Rejected</Text>
            <Text style={styles.infoText}>You can re-submit with updated credentials.</Text>
            <Button title="Re-Submit" onPress={() => setStep("apply")} variant="outline" style={{ marginTop: 12 }} />
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
  iconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.secondary + "15", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: SIZES.xxl, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: SIZES.md, color: COLORS.textSecondary },
  value: { fontSize: SIZES.md, color: COLORS.text, fontWeight: "500" },
  infoText: { fontSize: SIZES.md, color: COLORS.textSecondary, lineHeight: 22, marginTop: 8 },
  warningText: { fontSize: SIZES.sm, color: COLORS.warning, marginVertical: 8, fontWeight: "600" },
  gasNote: { fontSize: SIZES.xs, color: COLORS.textLight, textAlign: "center", marginTop: 8 },
  pendingTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.info, textAlign: "center", marginTop: 8 },
  verifiedTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.success, textAlign: "center", marginTop: 8 },
  rejectedTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.danger, textAlign: "center", marginTop: 8 },
});