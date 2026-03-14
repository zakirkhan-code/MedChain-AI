import React, { useState } from "react";
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
import { recordAPI } from "../../services/api";
import { createRecordOnChain, hashData } from "../../services/blockchain";
import { Button, Input, Card } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

const RECORD_TYPES = [
  { key: "LabReport", icon: "flask", label: "Lab Report" },
  { key: "Prescription", icon: "medkit", label: "Prescription" },
  { key: "Imaging", icon: "scan", label: "Imaging" },
  { key: "Diagnosis", icon: "search", label: "Diagnosis" },
  { key: "Vaccination", icon: "shield-checkmark", label: "Vaccination" },
  { key: "Surgery", icon: "cut", label: "Surgery" },
  { key: "Discharge", icon: "log-out", label: "Discharge" },
  { key: "Other", icon: "document", label: "Other" },
];

export default function AddRecordScreen({ navigation }) {
  const { user } = useAuth();
  const { privateKey, hasWallet } = useWalletContext();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recordType, setRecordType] = useState("LabReport");
  const [dataFields, setDataFields] = useState([{ key: "", value: "" }]);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveOnChain, setSaveOnChain] = useState(true);

  const addField = () => setDataFields([...dataFields, { key: "", value: "" }]);

  const removeField = (index) => {
    const updated = dataFields.filter((_, i) => i !== index);
    setDataFields(updated.length ? updated : [{ key: "", value: "" }]);
  };

  const updateField = (index, field, value) => {
    const updated = [...dataFields];
    updated[index][field] = value;
    setDataFields(updated);
  };

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert("Error", "Title is required");
    if (!description.trim())
      return Alert.alert("Error", "Description is required");

    setLoading(true);
    try {
      // Prepare data
      const data = {};
      dataFields.forEach((f) => {
        if (f.key.trim() && f.value.trim()) data[f.key.trim()] = f.value.trim();
      });

      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // 1. Save to backend (MongoDB)
      const res = await recordAPI.create({
        title: title.trim(),
        description: description.trim(),
        recordType,
        data,
        tags: tagArray,
      });

      const record = res.data.data;
      let chainResult = null;

      // 2. Save on blockchain if enabled and wallet available
      if (saveOnChain && hasWallet && privateKey && user?.walletAddress) {
        try {
          const contentHash = hashData({
            title,
            description,
            data,
            recordType,
          });

          chainResult = await createRecordOnChain(
            privateKey,
            user.walletAddress,
            contentHash,
            record.ipfsURI || "",
            recordType,
            description.trim(),
          );

          if (chainResult.success) {
            // Update backend with tx info
            try {
              await recordAPI.update(record._id, {
                txHash: chainResult.txHash,
                blockNumber: chainResult.blockNumber,
              });
            } catch {}
          }
        } catch (chainErr) {
          console.warn("On-chain failed:", chainErr.message);
        }
      }

      const msg = chainResult?.success
        ? `Record created!\n\nMongoDB \nBlockchain \nTx: ${chainResult.txHash.slice(0, 20)}...`
        : "Record created!\n\nMongoDB \nBlockchain: Skipped";

      Alert.alert("Success 🎉", msg, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Card>
          <Input
            label="Title *"
            icon="document-text-outline"
            placeholder="e.g. Blood Test Report"
            value={title}
            onChangeText={setTitle}
          />
          <Input
            label="Description *"
            icon="create-outline"
            placeholder="Brief description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>Record Type</Text>
          <View style={styles.typeGrid}>
            {RECORD_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setRecordType(t.key)}
                style={[
                  styles.typeCard,
                  recordType === t.key && styles.typeCardActive,
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={t.icon}
                  size={20}
                  color={recordType === t.key ? COLORS.white : COLORS.primary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    recordType === t.key && { color: COLORS.white },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Data Fields</Text>
          {dataFields.map((f, i) => (
            <View key={i} style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="Key (e.g. Hemoglobin)"
                  value={f.key}
                  onChangeText={(v) => updateField(i, "key", v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="Value (e.g. 14.5 g/dL)"
                  value={f.value}
                  onChangeText={(v) => updateField(i, "value", v)}
                />
              </View>
              <TouchableOpacity
                onPress={() => removeField(i)}
                style={styles.removeBtn}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addField} style={styles.addBtn}>
            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Add Field</Text>
          </TouchableOpacity>
        </Card>

        <Card>
          <Input
            label="Tags (comma separated)"
            icon="pricetags-outline"
            placeholder="blood-test, annual"
            value={tags}
            onChangeText={setTags}
          />
        </Card>

        {/* On-Chain Toggle */}
        <Card>
          <TouchableOpacity
            onPress={() => setSaveOnChain(!saveOnChain)}
            style={styles.toggleRow}
          >
            <View style={styles.toggleLeft}>
              <Ionicons
                name="cube-outline"
                size={22}
                color={saveOnChain ? COLORS.success : COLORS.textLight}
              />
              <View>
                <Text style={styles.toggleTitle}>Save on Blockchain</Text>
                <Text style={styles.toggleDesc}>
                  {saveOnChain
                    ? "Record hash will be stored on Sepolia"
                    : "Off-chain only (MongoDB)"}
                </Text>
              </View>
            </View>
            <View style={[styles.toggle, saveOnChain && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleDot,
                  saveOnChain && styles.toggleDotActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          {saveOnChain && !hasWallet && (
            <Text style={styles.chainWarning}>
              ⚠️ Private key not set. Go to Blockchain Registration first.
            </Text>
          )}

          {saveOnChain && hasWallet && (
            <Text style={styles.chainReady}>
              {" "}
              Wallet ready. Record will be saved on-chain.
            </Text>
          )}
        </Card>

        <Button
          title="Create Record"
          onPress={handleCreate}
          loading={loading}
          icon="checkmark-circle-outline"
          style={{ marginTop: 8 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCard: {
    width: "23%",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    gap: 4,
  },
  typeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  typeLabel: { fontSize: 10, fontWeight: "600", color: COLORS.text },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  removeBtn: { padding: 4 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addBtnText: { fontSize: SIZES.sm, color: COLORS.primary, fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  toggleTitle: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  toggleDesc: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: { backgroundColor: COLORS.success },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  toggleDotActive: { alignSelf: "flex-end" },
  chainWarning: { fontSize: SIZES.xs, color: COLORS.warning, marginTop: 8 },
  chainReady: { fontSize: SIZES.xs, color: COLORS.success, marginTop: 8 },
});
