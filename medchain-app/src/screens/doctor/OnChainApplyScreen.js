import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useWalletContext } from "../../context/WalletContext";
import { doctorAPI } from "../../services/api";
import {
  doctorSubmitApplication,
  getDoctorStatus,
  STATUS_MAP,
} from "../../services/blockchain";
import { Button, Card, Badge, Input } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

const SPECIALIZATIONS = [
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "Oncology",
  "Psychiatry",
  "Surgery",
  "Radiology",
  "Gynecology",
  "Urology",
  "ENT",
  "Ophthalmology",
  "GeneralMedicine",
  "Dentistry",
  "Physiotherapy",
  "Other",
];

export default function OnChainApplyScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { privateKey, savePrivateKey, hasWallet } = useWalletContext();
  const [pkInput, setPkInput] = useState("");
  const [status, setStatus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [step, setStep] = useState("check");

  // Application form fields
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [credentials, setCredentials] = useState("");
  const [showSpecPicker, setShowSpecPicker] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setCheckingStatus(true);

    if (!user?.walletAddress) {
      setStep("no_wallet");
      setCheckingStatus(false);
      return;
    }

    // Check blockchain status
    const s = await getDoctorStatus(user.walletAddress);
    setStatus(s);

    // Blockchain status decides the step — NOT MongoDB data
    if (s === 0) {
      // Not on blockchain yet — show full flow from step 1
      setStep("apply_form");
    } else if (s === 1) {
      setStep("pending");
    } else if (s === 2) {
      setStep("verified");
    } else if (s === 3) {
      setStep("rejected");
    } else if (s === 4) {
      setStep("suspended");
    } else {
      setStep("apply_form");
    }

    setCheckingStatus(false);
  };

  // Step 1: Submit application to backend + enter private key + submit on-chain (ALL IN ONE)
  const handleFullSubmit = async () => {
    // Validate form
    if (!specialization) return Alert.alert("Error", "Select specialization");
    if (!licenseNumber.trim())
      return Alert.alert("Error", "Enter license number");
    if (!pkInput.trim() || pkInput.trim().length < 64)
      return Alert.alert(
        "Error",
        "Enter valid private key (64 hex characters)",
      );

    setLoading(true);
    try {
      // 1. Save private key
      const key = pkInput.trim().startsWith("0x")
        ? pkInput.trim()
        : "0x" + pkInput.trim();
      await savePrivateKey(key);

      // 2. Submit to backend (MongoDB)
      await doctorAPI.submitApplication({
        specialization,
        licenseNumber: licenseNumber.trim(),
        credentials: credentials.trim(),
      });

      updateUser({
        specialization,
        licenseNumber: licenseNumber.trim(),
        credentials: credentials.trim(),
      });

      console.log(" Application saved to MongoDB");

      // 3. Submit on blockchain
      console.log("📤 Submitting to blockchain...");
      const result = await doctorSubmitApplication(
        key,
        credentials.trim() || "",
        specialization,
        licenseNumber.trim(),
      );

      if (result.success) {
        // 4. Confirm on backend
        try {
          const API = (await import("../../services/api")).default;
          await API.post("/doctors/confirm-onchain", { txHash: result.txHash });
        } catch {}

        updateUser({ onChainStatus: 1 });
        setStatus(1);
        setStep("pending");

        Alert.alert(
          "Success! 🎉",
          `Application submitted!\n\n MongoDB saved\n Blockchain saved\n\nTx: ${result.txHash.slice(0, 20)}...\nBlock: ${result.blockNumber}\n\nWait for admin verification.`,
        );
      } else {
        Alert.alert(
          "Blockchain Failed",
          `MongoDB saved \nBlockchain failed ❌\n\n${result.message}\n\nYou can retry from this screen.`,
        );
        // Stay on form so they can retry
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  // Retry on-chain only (if MongoDB already saved but blockchain failed)
  const handleRetryChain = async () => {
    if (!privateKey && !pkInput.trim())
      return Alert.alert("Error", "Enter private key");

    const key =
      privateKey ||
      (pkInput.trim().startsWith("0x")
        ? pkInput.trim()
        : "0x" + pkInput.trim());
    if (!privateKey) await savePrivateKey(key);

    const spec = user?.specialization || specialization;
    const license = user?.licenseNumber || licenseNumber;
    const cred = user?.credentials || credentials;

    if (!spec || !license)
      return Alert.alert("Error", "Fill specialization and license first");

    setLoading(true);
    try {
      const result = await doctorSubmitApplication(
        key,
        cred || "",
        spec,
        license,
      );

      if (result.success) {
        try {
          const API = (await import("../../services/api")).default;
          await API.post("/doctors/confirm-onchain", { txHash: result.txHash });
        } catch {}

        updateUser({ onChainStatus: 1 });
        setStatus(1);
        setStep("pending");
        Alert.alert(
          "Success! 🎉",
          `Blockchain submitted!\n\nTx: ${result.txHash.slice(0, 20)}...`,
        );
      } else {
        Alert.alert("Failed", result.message);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  const statusLabel = STATUS_MAP.doctor[status] || "Unknown";
  const statusColor = {
    0: "warning",
    1: "info",
    2: "success",
    3: "danger",
    4: "danger",
  };

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
            <Ionicons name="medkit" size={32} color={COLORS.secondary} />
          </View>
          <Text style={styles.title}>Doctor Verification</Text>
          <Text style={styles.subtitle}>Apply & register on blockchain</Text>
        </View>

        {/* Status Card */}
        <Card>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.label}>On-Chain:</Text>
            <Badge
              label={statusLabel}
              variant={statusColor[status] || "default"}
            />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Wallet:</Text>
            <Text
              style={[styles.value, { fontFamily: "monospace", fontSize: 11 }]}
            >
              {user?.walletAddress
                ? `${user.walletAddress.slice(0, 12)}...${user.walletAddress.slice(-6)}`
                : "Not set"}
            </Text>
          </View>
        </Card>

        {/* No Wallet */}
        {step === "no_wallet" && (
          <Card>
            <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
            <Text style={styles.infoText}>
              Add your wallet address in profile first.
            </Text>
            <Button
              title="Go to Profile"
              onPress={() => navigation.navigate("EditProfile")}
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        {/* Application Form + Private Key + Submit (ALL IN ONE) */}
        {step === "apply_form" && (
          <Card>
            <Text style={styles.sectionTitle}>Complete Application</Text>
            <Text style={styles.infoText}>
              Fill your details, enter private key, and submit to blockchain in
              one step.
            </Text>

            {/* Specialization Picker */}
            <Text style={styles.fieldLabel}>Specialization *</Text>
            <TouchableOpacity
              onPress={() => setShowSpecPicker(!showSpecPicker)}
              style={styles.pickerBtn}
            >
              <Text
                style={[
                  styles.pickerText,
                  !specialization && { color: COLORS.textLight },
                ]}
              >
                {specialization || "Select specialization"}
              </Text>
              <Ionicons
                name={showSpecPicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {showSpecPicker && (
              <View style={styles.specList}>
                {SPECIALIZATIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setSpecialization(s);
                      setShowSpecPicker(false);
                    }}
                    style={[
                      styles.specItem,
                      specialization === s && styles.specItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.specText,
                        specialization === s && { color: COLORS.white },
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* License */}
            <Input
              label="License Number *"
              icon="document-text-outline"
              placeholder="e.g. PMC-123456"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
            />

            {/* Credentials */}
            <Input
              label="Credentials"
              icon="school-outline"
              placeholder="e.g. MBBS, FCPS Cardiology"
              value={credentials}
              onChangeText={setCredentials}
              multiline
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Wallet</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Private Key */}
            <Input
              label="Private Key *"
              icon="key-outline"
              placeholder="Enter your MetaMask private key"
              value={pkInput}
              onChangeText={setPkInput}
              autoCapitalize="none"
              secureTextEntry
            />
            <Text style={styles.warningText}>
              ⚠️ Your private key stays on your device only. Never share it!
            </Text>

            {/* Submit Button */}
            <Button
              title={
                loading
                  ? "Submitting..."
                  : "Submit Application (MongoDB + Blockchain)"
              }
              onPress={handleFullSubmit}
              loading={loading}
              icon="cloud-upload-outline"
              style={{ marginTop: 16 }}
            />
            <Text style={styles.gasNote}>
              💡 Requires Sepolia ETH for gas fees
            </Text>

            {/* Retry button if MongoDB saved but chain failed */}
            {user?.specialization && user?.licenseNumber && (
              <View style={styles.retryBox}>
                <Text style={styles.retryText}>
                  Application already saved in DB? Just retry blockchain:
                </Text>
                <Button
                  title="Retry Blockchain Only"
                  onPress={handleRetryChain}
                  loading={loading}
                  variant="outline"
                  icon="refresh-outline"
                  style={{ marginTop: 8 }}
                />
              </View>
            )}
          </Card>
        )}

        {/* Pending */}
        {step === "pending" && (
          <Card>
            <Ionicons
              name="time"
              size={32}
              color={COLORS.info}
              style={{ alignSelf: "center" }}
            />
            <Text style={styles.pendingTitle}>Application Pending</Text>
            <Text style={styles.infoText}>
              Your application is on blockchain. Waiting for admin verification.
            </Text>
            <View style={styles.stepsCompleted}>
              <Text style={styles.stepDone}> MongoDB — Application saved</Text>
              <Text style={styles.stepDone}>
                {" "}
                Blockchain — Submitted on Sepolia
              </Text>
              <Text style={styles.stepWaiting}>
                ⏳ Admin — Waiting for verification
              </Text>
            </View>
            <Button
              title="Refresh Status"
              onPress={checkStatus}
              variant="outline"
              icon="refresh-outline"
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        {/* Verified */}
        {step === "verified" && (
          <Card>
            <Ionicons
              name="checkmark-circle"
              size={32}
              color={COLORS.success}
              style={{ alignSelf: "center" }}
            />
            <Text style={styles.verifiedTitle}>Verified Doctor! </Text>
            <Text style={styles.infoText}>
              You are verified on blockchain. Full access to all features.
            </Text>
            <View style={styles.stepsCompleted}>
              <Text style={styles.stepDone}> MongoDB — Application saved</Text>
              <Text style={styles.stepDone}>
                {" "}
                Blockchain — Registered on Sepolia
              </Text>
              <Text style={styles.stepDone}> Admin — Verified</Text>
            </View>
          </Card>
        )}

        {/* Rejected */}
        {step === "rejected" && (
          <Card>
            <Ionicons
              name="close-circle"
              size={32}
              color={COLORS.danger}
              style={{ alignSelf: "center" }}
            />
            <Text style={styles.rejectedTitle}>Application Rejected</Text>
            <Text style={styles.infoText}>
              Your application was rejected. You can re-submit with updated
              credentials.
            </Text>
            <Button
              title="Re-Submit Application"
              onPress={() => setStep("apply_form")}
              variant="outline"
              icon="refresh-outline"
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        {/* Suspended */}
        {step === "suspended" && (
          <Card>
            <Ionicons
              name="ban"
              size={32}
              color={COLORS.danger}
              style={{ alignSelf: "center" }}
            />
            <Text style={styles.rejectedTitle}>Account Suspended</Text>
            <Text style={styles.infoText}>
              Your account has been suspended. Contact admin for more
              information.
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: SIZES.md, color: COLORS.textSecondary },
  header: { alignItems: "center", marginBottom: 20, paddingTop: 10 },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.secondary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: SIZES.xxl, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: { fontSize: SIZES.md, color: COLORS.textSecondary },
  value: { fontSize: SIZES.md, color: COLORS.text, fontWeight: "500" },
  infoText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 8,
  },
  warningText: { fontSize: SIZES.xs, color: COLORS.warning, marginTop: 4 },
  fieldLabel: {
    fontSize: SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  pickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  pickerText: { fontSize: SIZES.md, color: COLORS.text },
  specList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  specItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  specItemActive: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondary,
  },
  specText: { fontSize: SIZES.sm, color: COLORS.text, fontWeight: "500" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    marginHorizontal: 12,
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    fontWeight: "600",
  },
  gasNote: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 8,
  },
  retryBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  retryText: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  pendingTitle: {
    fontSize: SIZES.lg,
    fontWeight: "700",
    color: COLORS.info,
    textAlign: "center",
    marginTop: 8,
  },
  verifiedTitle: {
    fontSize: SIZES.lg,
    fontWeight: "700",
    color: COLORS.success,
    textAlign: "center",
    marginTop: 8,
  },
  rejectedTitle: {
    fontSize: SIZES.lg,
    fontWeight: "700",
    color: COLORS.danger,
    textAlign: "center",
    marginTop: 8,
  },
  stepsCompleted: {
    marginTop: 16,
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  stepDone: { fontSize: SIZES.sm, color: COLORS.success },
  stepWaiting: { fontSize: SIZES.sm, color: COLORS.info },
});
