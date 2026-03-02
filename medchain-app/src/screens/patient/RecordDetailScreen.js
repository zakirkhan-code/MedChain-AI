import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { recordAPI } from "../../services/api";
import { Card, Badge, Loader, Button } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function RecordDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    recordAPI.getById(id)
      .then((res) => setRecord(res.data.data))
      .catch((err) => Alert.alert("Error", err.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await recordAPI.verify(id);
      Alert.alert("Verification Result", `Hash: ${res.data.data.contentHash?.substring(0, 20)}...\nStatus: ${res.data.data.status}\nVersion: ${res.data.data.version}`);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Verification failed");
    }
    setVerifying(false);
  };

  const handleArchive = () => {
    Alert.alert("Archive Record", "Are you sure? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: async () => {
        try {
          await recordAPI.archive(id);
          Alert.alert("Success", "Record archived");
          navigation.goBack();
        } catch (err) {
          Alert.alert("Error", err.response?.data?.message || "Failed");
        }
      }},
    ]);
  };

  if (loading) return <Loader text="Loading record..." />;
  if (!record) return <Loader text="Record not found" />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.icon, { backgroundColor: COLORS.info + "15" }]}>
            <Ionicons name="document-text" size={28} color={COLORS.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{record.title}</Text>
            <Text style={styles.date}>{new Date(record.createdAt).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <Badge label={record.recordType} variant="info" />
          <Badge label={record.status} variant={record.status === "Active" ? "success" : record.status === "Amended" ? "warning" : "default"} />
          <Badge label={`v${record.version}`} variant="purple" />
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.desc}>{record.description}</Text>
        </Card>

        {record.contentHash && (
          <Card>
            <Text style={styles.sectionTitle}>Blockchain Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Content Hash</Text>
              <Text style={styles.hashText}>{record.contentHash}</Text>
            </View>
            {record.txHash && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tx Hash</Text>
                <Text style={styles.hashText}>{record.txHash}</Text>
              </View>
            )}
            {record.ipfsURI && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>IPFS URI</Text>
                <Text style={styles.hashText}>{record.ipfsURI}</Text>
              </View>
            )}
          </Card>
        )}

        {record.tags && record.tags.length > 0 && (
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

        {record.amendments && record.amendments.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Amendment History</Text>
            {record.amendments.map((a, i) => (
              <View key={i} style={styles.amendment}>
                <Text style={styles.amendVersion}>v{a.version}</Text>
                <Text style={styles.amendReason}>{a.reason}</Text>
                <Text style={styles.amendDate}>{new Date(a.createdAt).toLocaleString()}</Text>
              </View>
            ))}
          </Card>
        )}

        {record.uploadedBy && (
          <Card>
            <Text style={styles.sectionTitle}>Uploaded By</Text>
            <Text style={styles.desc}>{record.uploadedBy.name || "Unknown"} — {record.uploadedBy.role}</Text>
          </Card>
        )}

        <View style={styles.actions}>
          <Button title="Verify Integrity" onPress={handleVerify} loading={verifying} icon="shield-checkmark-outline" variant="outline" style={{ flex: 1 }} />
          {record.status === "Active" && (
            <Button title="Archive" onPress={handleArchive} icon="archive-outline" variant="danger" style={{ flex: 1 }} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  icon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text },
  date: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  desc: { fontSize: SIZES.md, color: COLORS.textSecondary, lineHeight: 22 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: SIZES.xs, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 2 },
  hashText: { fontSize: SIZES.xs, color: COLORS.text, fontFamily: "monospace" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.primary + "15", borderRadius: 12 },
  tagText: { fontSize: SIZES.xs, color: COLORS.primary, fontWeight: "600" },
  amendment: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  amendVersion: { fontSize: SIZES.xs, fontWeight: "700", color: COLORS.purple },
  amendReason: { fontSize: SIZES.sm, color: COLORS.text, marginTop: 2 },
  amendDate: { fontSize: SIZES.xs, color: COLORS.textLight, marginTop: 2 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 40 },
});