import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { accessAPI } from "../../services/api";
import { Card, Badge } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function AccessScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const res = await accessAPI.getPermissions();
      setLogs(res.data.data || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load access logs");
    }
    setLoading(false);
  };

  const actionColors = {
    granted: { bg: "#ECFDF5", text: "#059669", icon: "shield-checkmark" },
    revoked: { bg: "#FEF2F2", text: "#DC2626", icon: "close-circle" },
    expired: { bg: "#FFF7ED", text: "#EA580C", icon: "time" },
    requested: { bg: "#EFF6FF", text: "#2563EB", icon: "help-circle" },
  };

  const renderLog = ({ item }) => {
    const style = actionColors[item.action] || actionColors.granted;

    return (
      <Card style={{ marginBottom: 10 }}>
        <View style={styles.logHeader}>
          <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
            <Ionicons name={style.icon} size={20} color={style.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.logAction}>{item.action?.toUpperCase()}</Text>
            <Text style={styles.logDate}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
          <Badge label={item.action} variant={item.action === "granted" ? "success" : item.action === "revoked" ? "danger" : "default"} />
        </View>

        {item.provider && (
          <View style={styles.logRow}>
            <Text style={styles.logLabel}>Doctor:</Text>
            <Text style={styles.logValue}>{item.provider?.name || "Unknown"}</Text>
          </View>
        )}

        {item.accessLevel && (
          <View style={styles.logRow}>
            <Text style={styles.logLabel}>Level:</Text>
            <Text style={styles.logValue}>{item.accessLevel}</Text>
          </View>
        )}

        {item.purpose && (
          <View style={styles.logRow}>
            <Text style={styles.logLabel}>Purpose:</Text>
            <Text style={styles.logValue}>{item.purpose}</Text>
          </View>
        )}

        {item.txHash && (
          <TouchableOpacity onPress={() => Linking.openURL(`https://sepolia.etherscan.io/tx/${item.txHash}`)}>
            <View style={styles.txRow}>
              <Ionicons name="cube" size={14} color={COLORS.primary} />
              <Text style={styles.txText}>{item.txHash.slice(0, 24)}... 🔗</Text>
            </View>
          </TouchableOpacity>
        )}

        {!item.txHash && (
          <Text style={styles.offChain}>Off-chain only</Text>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Access Permissions</Text>
        <Text style={styles.subtitle}>{logs.length} access logs</Text>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLog}
        keyExtractor={(item, i) => item._id || i.toString()}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchLogs}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No access logs yet</Text>
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
  list: { padding: 20, paddingTop: 0 },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logAction: { fontSize: SIZES.sm, fontWeight: "700", color: COLORS.text },
  logDate: { fontSize: SIZES.xs, color: COLORS.textLight, marginTop: 2 },
  logRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  logLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  logValue: { fontSize: SIZES.sm, color: COLORS.text, fontWeight: "500" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: COLORS.primary + "10", padding: 8, borderRadius: 8 },
  txText: { fontSize: SIZES.xs, color: COLORS.primary, fontFamily: "monospace" },
  offChain: { fontSize: SIZES.xs, color: COLORS.textLight, marginTop: 6, fontStyle: "italic" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: SIZES.md, color: COLORS.textLight, marginTop: 12 },
});