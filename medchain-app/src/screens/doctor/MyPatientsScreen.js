import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { accessAPI } from "../../services/api";
import { Card, Badge } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function MyPatientsScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      const res = await accessAPI.getMyPatients();
      setPatients(res.data.data.patients || []);
    } catch (err) {
      console.log("Error:", err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const renderPatient = ({ item }) => (
    <Card>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.detail}>{item.cnic || item.email || "—"}</Text>
          <Text style={styles.detail}>{item.phone || "—"}</Text>
          {item.bloodType ? (
            <View style={styles.infoRow}>
              <Ionicons name="water" size={12} color={COLORS.danger} />
              <Text style={styles.infoText}>Blood: {item.bloodType}</Text>
            </View>
          ) : null}
          {item.allergies ? (
            <View style={styles.infoRow}>
              <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
              <Text style={styles.infoText}>Allergies: {item.allergies}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.rightCol}>
          <Badge label={item.accessLevel || "ReadOnly"} variant="success" />
          <Text style={styles.dateText}>{new Date(item.grantedAt).toLocaleDateString()}</Text>
          {item.txHash && (
            <View style={styles.chainBadge}>
              <Ionicons name="cube" size={10} color={COLORS.success} />
              <Text style={styles.chainText}>On-chain</Text>
            </View>
          )}
        </View>
      </View>

      {item.walletAddress && (
        <View style={styles.walletRow}>
          <Ionicons name="wallet" size={12} color={COLORS.primary} />
          <Text style={styles.walletText}>{item.walletAddress.slice(0, 14)}...{item.walletAddress.slice(-6)}</Text>
        </View>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
        <Text style={styles.subtitle}>{patients.length} patients with access</Text>
      </View>

      <FlatList
        data={patients}
        renderItem={renderPatient}
        keyExtractor={(item, i) => item._id || i.toString()}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchPatients}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Patients Yet</Text>
            <Text style={styles.emptyText}>Patients who grant you access will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
  list: { padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.primary + "15", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.primary },
  name: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text },
  detail: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  infoText: { fontSize: SIZES.xs, color: COLORS.textSecondary },
  rightCol: { alignItems: "flex-end", gap: 4 },
  dateText: { fontSize: SIZES.xs, color: COLORS.textLight },
  chainBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.success + "15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  chainText: { fontSize: 10, color: COLORS.success, fontWeight: "600" },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  walletText: { fontSize: SIZES.xs, color: COLORS.primary, fontFamily: "monospace" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.textLight },
  emptyText: { fontSize: SIZES.sm, color: COLORS.textLight, textAlign: "center" },
});