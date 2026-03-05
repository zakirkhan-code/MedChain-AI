import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { recordAPI } from "../../services/api";
import { Card, Button, Badge } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function RecordDetailScreen({ route }) {
  const { recordId } = route.params;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => { fetchRecord(); }, []);

  const fetchRecord = async () => {
    try {
      const res = await recordAPI.getById(recordId);
      setRecord(res.data.data);
    } catch (err) {
      Alert.alert("Error", "Failed to load record");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await recordAPI.verify(recordId);
      const verified = res.data.data?.verified;
      Alert.alert(
        verified ? "Integrity Verified ✅" : "Verification Failed ❌",
        verified ? "Record hash matches — data has not been tampered with." : "Record hash mismatch — data may have been altered!"
      );
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Verification failed");
    }
    setVerifying(false);
  };

  const handleArchive = async () => {
    Alert.alert("Archive Record", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          setArchiving(true);
          try {
            await recordAPI.archive(recordId);
            Alert.alert("Done", "Record archived");
            fetchRecord();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Archive failed");
          }
          setArchiving(false);
        },
      },
    ]);
  };

  const openEtherscan = (txHash) => {
    Linking.openURL(`https://sepolia.etherscan.io/tx/${txHash}`);
  };

  if (loading) {
    return <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>;
  }
  if (!record) {
    return <View style={styles.center}><Text style={styles.loadingText}>Record not found</Text></View>;
  }

  const statusColor = { active: COLORS.success, archived: COLORS.textLight, amended: COLORS.info };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Card>
          <View style={styles.header}>
            <Text style={styles.title}>{record.title}</Text>
            <Badge label={record.status || "active"} variant={record.status === "active" ? "success" : "default"} />
          </View>
          <Text style={styles.description}>{record.description}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>Type: {record.recordType}</Text>
            <Text style={styles.metaText}>Created: {new Date(record.createdAt).toLocaleDateString()}</Text>
          </View>
        </Card>

        {/* Data Fields */}
        {record.data && Object.keys(record.data).length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Record Data</Text>
            {Object.entries(record.data).map(([key, val], i) => (
              <View key={i} style={styles.dataRow}>
                <Text style={styles.dataKey}>{key}</Text>
                <Text style={styles.dataValue}>{val}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Tags */}
        {record.tags?.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagRow}>
              {record.tags.map((t, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Blockchain Info */}
        <Card>
          <Text style={styles.sectionTitle}>Blockchain Info</Text>
          <View style={styles.chainRow}>
            <Text style={styles.chainLabel}>Content Hash:</Text>
            <Text style={styles.chainValue}>{record.contentHash ? record.contentHash.slice(0, 20) + "..." : "Not hashed"}</Text>
          </View>
          {record.txHash && (
            <TouchableOpacity onPress={() => openEtherscan(record.txHash)}>
              <View style={styles.chainRow}>
                <Text style={styles.chainLabel}>Tx Hash:</Text>
                <Text style={[styles.chainValue, { color: COLORS.primary }]}>{record.txHash.slice(0, 20)}... 🔗</Text>
              </View>
            </TouchableOpacity>
          )}
          {record.blockNumber && (
            <View style={styles.chainRow}>
              <Text style={styles.chainLabel}>Block:</Text>
              <Text style={styles.chainValue}>{record.blockNumber}</Text>
            </View>
          )}
          {record.ipfsURI && (
            <View style={styles.chainRow}>
              <Text style={styles.chainLabel}>IPFS:</Text>
              <Text style={styles.chainValue}>{record.ipfsURI.slice(0, 30)}...</Text>
            </View>
          )}
          {!record.txHash && (
            <Text style={styles.offChainNote}>📋 This record is off-chain only (MongoDB)</Text>
          )}
          {record.txHash && (
            <Text style={styles.onChainNote}>✅ This record is verified on Sepolia blockchain</Text>
          )}
        </Card>

        {/* Amendments */}
        {record.amendments?.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Amendment History</Text>
            {record.amendments.map((a, i) => (
              <View key={i} style={styles.amendRow}>
                <Text style={styles.amendVersion}>v{a.version}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.amendReason}>{a.reason}</Text>
                  <Text style={styles.amendDate}>{new Date(a.date).toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Verify Integrity" onPress={handleVerify} loading={verifying} variant="outline" icon="shield-checkmark-outline" />
          {record.status === "active" && (
            <Button title="Archive Record" onPress={handleArchive} loading={archiving} variant="danger" icon="archive-outline" style={{ marginTop: 8 }} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: SIZES.md, color: COLORS.textSecondary },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text, flex: 1 },
  description: { fontSize: SIZES.md, color: COLORS.textSecondary, lineHeight: 22 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  metaText: { fontSize: SIZES.xs, color: COLORS.textLight },
  sectionTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  dataRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dataKey: { fontSize: SIZES.sm, color: COLORS.textSecondary, fontWeight: "600" },
  dataValue: { fontSize: SIZES.sm, color: COLORS.text, fontWeight: "500" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: COLORS.primary + "15", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: SIZES.xs, color: COLORS.primary, fontWeight: "600" },
  chainRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chainLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  chainValue: { fontSize: SIZES.xs, color: COLORS.text, fontFamily: "monospace", maxWidth: "60%" },
  offChainNote: { fontSize: SIZES.xs, color: COLORS.warning, marginTop: 8 },
  onChainNote: { fontSize: SIZES.xs, color: COLORS.success, marginTop: 8 },
  amendRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  amendVersion: { fontSize: SIZES.xs, fontWeight: "700", color: COLORS.primary, backgroundColor: COLORS.primary + "15", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  amendReason: { fontSize: SIZES.sm, color: COLORS.text },
  amendDate: { fontSize: SIZES.xs, color: COLORS.textLight, marginTop: 2 },
  actions: { marginTop: 8 },
});