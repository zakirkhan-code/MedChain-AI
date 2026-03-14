import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useWalletContext } from "../../context/WalletContext";
import { patientSubmitRegistration, patientGiveConsent, getPatientStatus, STATUS_MAP } from "../../services/blockchain";
import { Button, Card, Badge, Input } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function OnChainRegisterScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { privateKey, savePrivateKey } = useWalletContext();
  const [pkInput, setPkInput] = useState("");
  const [status, setStatus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [step, setStep] = useState("check");

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    setCheckingStatus(true);

    if (!user?.walletAddress) {
      setStep("no_wallet");
      setCheckingStatus(false);
      return;
    }

    const s = await getPatientStatus(user.walletAddress);
    setStatus(s);

    // Always check blockchain status — NOT stored private key
    if (s === 0) setStep("register_form");
    else if (s === 1) setStep("pending");
    else if (s === 2) setStep("approved");
    else if (s === 3) setStep("rejected");
    else if (s === 4) setStep("active");
    else if (s === 5) setStep("deactivated");
    else setStep("register_form");

    setCheckingStatus(false);
  };

  // All in one: Enter private key + submit on-chain
  const handleFullSubmit = async () => {
    if (!pkInput.trim() || pkInput.trim().length < 64) {
      return Alert.alert("Error", "Enter valid private key (64 hex characters)");
    }

    setLoading(true);
    try {
      // 1. Save private key
      const key = pkInput.trim().startsWith("0x") ? pkInput.trim() : "0x" + pkInput.trim();
      await savePrivateKey(key);

      // 2. Submit on blockchain
      console.log("📤 Submitting patient registration...");
      const result = await patientSubmitRegistration(
        key,
        { name: user.name, cnic: user.cnic, phone: user.phone },
        user.bloodType || "",
        user.allergies || ""
      );

      if (result.success) {
        // 3. Confirm on backend
        try {
          const API = (await import("../../services/api")).default;
          await API.post("/patients/confirm-onchain", { txHash: result.txHash });
        } catch {}

        updateUser({ onChainStatus: 1 });
        setStatus(1);
        setStep("pending");

        Alert.alert(
          "Success! 🎉",
          `Registration submitted!\n\n✅ Blockchain saved\n\nTx: ${result.txHash.slice(0, 20)}...\nBlock: ${result.blockNumber}\n\nWait for admin approval.`
        );
      } else {
        Alert.alert("Failed", result.message);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  // Give consent (after admin approval)
  const handleConsent = async () => {
    if (!privateKey) {
      return Alert.alert("Error", "Private key not found. Enter your private key again.");
    }

    setLoading(true);
    try {
      const result = await patientGiveConsent(privateKey);
      if (result.success) {
        try {
          const API = (await import("../../services/api")).default;
          await API.post("/patients/confirm-consent", { txHash: result.txHash });
        } catch {}

        updateUser({ onChainStatus: 4 });
        setStatus(4);
        setStep("active");
        Alert.alert("Welcome! 🎉", "You are now an Active patient on the blockchain!");
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

  if (checkingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="hourglass-outline" size={32} color={COLORS.primary} />
        <Text style={styles.loadingText}>Checking blockchain status...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Blockchain Registration</Text>
          <Text style={styles.subtitle}>Register on Sepolia Testnet</Text>
        </View>

        {/* Status Card */}
        <Card>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.label}>On-Chain:</Text>
            <Badge label={statusLabel} variant={statusColor[status] || "default"} />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Wallet:</Text>
            <Text style={[styles.value, { fontFamily: "monospace", fontSize: 11 }]}>
              {user?.walletAddress ? `${user.walletAddress.slice(0, 12)}...${user.walletAddress.slice(-6)}` : "Not set"}
            </Text>
          </View>
        </Card>

        {/* No Wallet */}
        {step === "no_wallet" && (
          <Card>
            <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
            <Text style={styles.infoText}>You don't have a wallet address. Go to Edit Profile and add your wallet address first.</Text>
            <Button title="Go to Profile" onPress={() => navigation.navigate("EditProfile")} variant="outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Register Form — Private Key + Submit */}
        {step === "register_form" && (
          <Card>
            <Text style={styles.sectionTitle}>Submit Registration</Text>
            <Text style={styles.infoText}>Enter your private key and submit your registration to the PatientRegistry contract on Sepolia.</Text>

            <View style={styles.previewBox}>
              <Text style={styles.previewItem}>Name: {user?.name}</Text>
              <Text style={styles.previewItem}>CNIC: {user?.cnic}</Text>
              <Text style={styles.previewItem}>Blood Type: {user?.bloodType || "Not set"}</Text>
              <Text style={styles.previewItem}>Wallet: {user?.walletAddress?.slice(0, 14)}...</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Wallet</Text>
              <View style={styles.dividerLine} />
            </View>

            <Input
              label="Private Key *"
              icon="key-outline"
              placeholder="Enter your MetaMask private key"
              value={pkInput}
              onChangeText={setPkInput}
              autoCapitalize="none"
              secureTextEntry
            />
            <Text style={styles.warningText}>⚠️ Your private key stays on your device only. Never share it!</Text>

            <Button
              title={loading ? "Submitting..." : "Submit Registration (On-Chain)"}
              onPress={handleFullSubmit}
              loading={loading}
              icon="cloud-upload-outline"
              style={{ marginTop: 16 }}
            />
            <Text style={styles.gasNote}>💡 Requires Sepolia ETH for gas fees</Text>
          </Card>
        )}

        {/* Pending */}
        {step === "pending" && (
          <Card>
            <Ionicons name="time" size={32} color={COLORS.info} style={{ alignSelf: "center" }} />
            <Text style={styles.pendingTitle}>Registration Pending</Text>
            <Text style={styles.infoText}>Your registration is submitted on blockchain. Please wait for admin approval.</Text>
            <View style={styles.stepsCompleted}>
              <Text style={styles.stepDone}>✅ Blockchain — Submitted on Sepolia</Text>
              <Text style={styles.stepWaiting}>⏳ Admin — Waiting for approval</Text>
            </View>
            <Button title="Refresh Status" onPress={checkStatus} variant="outline" icon="refresh-outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Approved — Give Consent */}
        {step === "approved" && (
          <Card>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.success} style={{ alignSelf: "center" }} />
            <Text style={styles.approvedTitle}>Registration Approved! 🎉</Text>
            <Text style={styles.infoText}>Admin has approved your registration. Now give your consent to activate your account.</Text>

            {!privateKey && (
              <View style={{ marginTop: 12 }}>
                <Input label="Private Key *" icon="key-outline" placeholder="Enter private key again" value={pkInput} onChangeText={setPkInput} autoCapitalize="none" secureTextEntry />
                <Button title="Save Key" onPress={async () => {
                  if (!pkInput.trim() || pkInput.trim().length < 64) return Alert.alert("Error", "Invalid key");
                  const key = pkInput.trim().startsWith("0x") ? pkInput.trim() : "0x" + pkInput.trim();
                  await savePrivateKey(key);
                  Alert.alert("Saved", "Now click Give Consent below");
                }} variant="outline" icon="key-outline" style={{ marginBottom: 8 }} />
              </View>
            )}

            <Button title="Give Consent & Activate" onPress={handleConsent} loading={loading} icon="hand-left-outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Active */}
        {step === "active" && (
          <Card>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.success} style={{ alignSelf: "center" }} />
            <Text style={styles.activeTitle}>Account Active on Blockchain! ✅</Text>
            <Text style={styles.infoText}>You are fully registered on Sepolia blockchain. You can now create records, grant access, and use all features.</Text>
            <View style={styles.stepsCompleted}>
              <Text style={styles.stepDone}>✅ Blockchain — Registered</Text>
              <Text style={styles.stepDone}>✅ Admin — Approved</Text>
              <Text style={styles.stepDone}>✅ Consent — Given</Text>
              <Text style={styles.stepDone}>✅ Status — Active</Text>
            </View>
          </Card>
        )}

        {/* Rejected */}
        {step === "rejected" && (
          <Card>
            <Ionicons name="close-circle" size={32} color={COLORS.danger} style={{ alignSelf: "center" }} />
            <Text style={styles.rejectedTitle}>Registration Rejected</Text>
            <Text style={styles.infoText}>Your registration was rejected. You can re-submit with updated information.</Text>
            <Button title="Re-Submit Registration" onPress={() => setStep("register_form")} variant="outline" icon="refresh-outline" style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Deactivated */}
        {step === "deactivated" && (
          <Card>
            <Ionicons name="ban" size={32} color={COLORS.danger} style={{ alignSelf: "center" }} />
            <Text style={styles.rejectedTitle}>Account Deactivated</Text>
            <Text style={styles.infoText}>Your account has been deactivated. Contact admin for support.</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: SIZES.md, color: COLORS.textSecondary },
  header: { alignItems: "center", marginBottom: 20, paddingTop: 10 },
  iconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primary + "15", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: SIZES.xxl, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: SIZES.md, color: COLORS.textSecondary },
  value: { fontSize: SIZES.md, color: COLORS.text, fontWeight: "500" },
  infoText: { fontSize: SIZES.md, color: COLORS.textSecondary, lineHeight: 22, marginTop: 8 },
  warningText: { fontSize: SIZES.xs, color: COLORS.warning, marginTop: 4 },
  previewBox: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 8, marginTop: 8 },
  previewItem: { fontSize: SIZES.sm, color: COLORS.text, marginBottom: 4 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 12, fontSize: SIZES.sm, color: COLORS.textLight, fontWeight: "600" },
  gasNote: { fontSize: SIZES.xs, color: COLORS.textLight, textAlign: "center", marginTop: 8 },
  pendingTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.info, textAlign: "center", marginTop: 8 },
  approvedTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.success, textAlign: "center", marginTop: 8 },
  activeTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.success, textAlign: "center", marginTop: 8 },
  rejectedTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.danger, textAlign: "center", marginTop: 8 },
  stepsCompleted: { marginTop: 16, backgroundColor: COLORS.bg, padding: 12, borderRadius: 10, gap: 6 },
  stepDone: { fontSize: SIZES.sm, color: COLORS.success },
  stepWaiting: { fontSize: SIZES.sm, color: COLORS.info },
});