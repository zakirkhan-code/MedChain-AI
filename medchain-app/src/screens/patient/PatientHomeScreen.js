import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { recordAPI, notificationAPI } from "../../services/api";
import { Card, Badge, SectionHeader, EmptyState } from "../../components/common";
import { COLORS, SIZES, SHADOWS } from "../../utils/theme";

export default function PatientHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [recRes, notifRes] = await Promise.all([
        recordAPI.getMyRecords({ page: 1, limit: 5 }),
        notificationAPI.getAll({ page: 1, limit: 1 }),
      ]);
      setRecords(recRes.data.data.records || []);
      setUnread(notifRes.data.data.unread || 0);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }, []);

  const statusMap = { 0: ["Not Registered", "warning"], 1: ["Pending", "info"], 2: ["Approved", "info"], 3: ["Rejected", "danger"], 4: ["Active", "success"], 5: ["Deactivated", "danger"] };
  const [statusLabel, statusVariant] = statusMap[user?.onChainStatus] || ["Unknown", "default"];

  const quickActions = [
    { icon: "shield-checkmark", label: "Blockchain", screen: "OnChainRegister", color: COLORS.success },
    { icon: "document-text", label: "Records", screen: "Records", color: COLORS.info },
    { icon: "medkit", label: "Doctors", screen: "DoctorList", color: COLORS.secondary },
    { icon: "chatbubbles", label: "AI Chat", screen: "AIChat", color: COLORS.purple },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0]} 👋</Text>
            <Text style={styles.subGreeting}>How are you feeling today?</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            {unread > 0 && <View style={styles.bellDot}><Text style={styles.bellDotText}>{unread}</Text></View>}
          </TouchableOpacity>
        </View>

        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>On-Chain Status</Text>
              <Badge label={statusLabel} variant={statusVariant} />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statusLabel}>Total Records</Text>
              <Text style={styles.statValue}>{user?.totalRecords || 0}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statusLabel}>Blood Type</Text>
              <Text style={styles.statValue}>{user?.bloodType || "—"}</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: a.color + "15" }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Recent Records" action="View All" onAction={() => navigation.navigate("Records")} />
        {records.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No records yet" subtitle="Your medical records will appear here" />
        ) : (
          records.map((r) => (
            <Card key={r._id} onPress={() => navigation.navigate("RecordDetail", { id: r._id })}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.recordIcon, { backgroundColor: COLORS.info + "15" }]}>
                  <Ionicons name="document-text" size={20} color={COLORS.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordTitle}>{r.title}</Text>
                  <Text style={styles.recordDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
                <Badge label={r.recordType} variant="info" />
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerBg: { backgroundColor: COLORS.primary, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: SIZES.xxl, fontWeight: "700", color: COLORS.white },
  subGreeting: { fontSize: SIZES.md, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  bellBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: -4, right: -4, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center" },
  bellDotText: { color: COLORS.white, fontSize: 10, fontWeight: "700" },
  statusCard: { marginTop: 0, marginBottom: -40, ...SHADOWS.lg },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  statusLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
  statValue: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text },
  content: { paddingHorizontal: 20, paddingTop: 52 },
  sectionTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  actionCard: { width: "22%", alignItems: "center", gap: 6 },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: SIZES.xs, fontWeight: "600", color: COLORS.text },
  recordIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recordTitle: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  recordDate: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
});
