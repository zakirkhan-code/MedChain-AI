import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { accessAPI } from "../../services/api";
import { Card, Badge, Loader, EmptyState } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function AccessScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accessAPI.getPermissions({ page: 1, limit: 50 })
      .then((res) => setLogs(res.data.data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const actionColors = {
    granted: "success", revoked: "danger", expired: "warning",
    emergency: "danger", requested: "info", approved: "success",
    rejected: "warning", cancelled: "default",
  };

  const actionIcons = {
    granted: "shield-checkmark", revoked: "close-circle", expired: "time",
    emergency: "alert-circle", requested: "help-circle", approved: "checkmark-circle",
    rejected: "remove-circle", cancelled: "ban",
  };

  const renderItem = ({ item }) => (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.icon, { backgroundColor: (COLORS[actionColors[item.action]] || COLORS.info) + "15" }]}>
          <Ionicons name={actionIcons[item.action] || "shield"} size={20} color={COLORS[actionColors[item.action]] || COLORS.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.provider?.name || item.patient?.name || "Unknown"}</Text>
          <Text style={styles.purpose} numberOfLines={1}>{item.purpose || "No purpose specified"}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Badge label={item.action?.toUpperCase()} variant={actionColors[item.action] || "default"} />
          {item.accessLevel && <Badge label={item.accessLevel} variant="info" />}
        </View>
      </View>
    </Card>
  );

  if (loading) return <Loader text="Loading access logs..." />;

  return (
    <FlatList
      style={styles.container}
      data={logs}
      renderItem={renderItem}
      keyExtractor={(i) => i._id}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={<EmptyState icon="shield-outline" title="No access logs" subtitle="Access permissions will appear here" />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  name: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  purpose: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 1 },
  date: { fontSize: SIZES.xs, color: COLORS.textLight, marginTop: 2 },
});