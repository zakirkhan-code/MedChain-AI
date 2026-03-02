import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { accessAPI, notificationAPI } from "../../services/api";
import { Card, Badge, EmptyState } from "../../components/common";
import { COLORS, SIZES, SHADOWS } from "../../utils/theme";

export default function DoctorHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [permRes, notifRes] = await Promise.all([
        accessAPI.getPermissions({ page: 1, limit: 10 }),
        notificationAPI.getAll({ page: 1, limit: 1 }),
      ]);
      setPatients(permRes.data.data.logs || []);
      setUnread(notifRes.data.data.unread || 0);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }, []);

  const statusMap = { 0: ["Not Applied", "warning"], 1: ["Pending", "info"], 2: ["Verified", "success"], 3: ["Rejected", "danger"], 4: ["Suspended", "danger"] };
  const [statusLabel, statusVariant] = statusMap[user?.onChainStatus] || ["Unknown", "default"];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Dr. {user?.name?.split(" ").pop()} 👨‍⚕️</Text>
            <Text style={styles.subGreeting}>{user?.specialization || "Specialist"}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            {unread > 0 && <View style={styles.bellDot}><Text style={styles.bellDotText}>{unread}</Text></View>}
          </TouchableOpacity>
        </View>

        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.label}>Verification</Text>
              <Badge label={statusLabel} variant={statusVariant} />
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.label}>Patients</Text>
              <Text style={styles.statVal}>{user?.totalPatients || 0}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.label}>Rating</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.statVal}>{user?.rating?.toFixed(1) || "N/A"}</Text>
              </View>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.content}>
        <View style={styles.actionsGrid}>
          {[
            { icon: "people", label: "My Patients", screen: "MyPatients", color: COLORS.info },
            { icon: "chatbubbles", label: "AI Chat", screen: "AIChat", color: COLORS.purple },
            { icon: "person-circle", label: "Profile", screen: "DoctorProfile", color: COLORS.secondary },
            { icon: "notifications", label: "Alerts", screen: "Notifications", color: COLORS.accent },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: a.color + "15" }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Patient Access</Text>
        {patients.length === 0 ? (
          <EmptyState icon="people-outline" title="No patients yet" subtitle="Patients will appear when they grant you access" />
        ) : (
          patients.slice(0, 5).map((p) => (
            <Card key={p._id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.patAvatar}>
                  <Ionicons name="person" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patName}>{p.patient?.name || "Patient"}</Text>
                  <Text style={styles.patDate}>{p.action} • {new Date(p.createdAt).toLocaleDateString()}</Text>
                </View>
                <Badge label={p.accessLevel || p.action} variant={p.action === "granted" ? "success" : p.action === "revoked" ? "danger" : "info"} />
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
  headerBg: { backgroundColor: COLORS.secondary, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: SIZES.xxl, fontWeight: "700", color: COLORS.white },
  subGreeting: { fontSize: SIZES.md, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  bellBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: -4, right: -4, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center" },
  bellDotText: { color: COLORS.white, fontSize: 10, fontWeight: "700" },
  statusCard: { marginBottom: -40, ...SHADOWS.lg },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
  statVal: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text },
  content: { paddingHorizontal: 20, paddingTop: 52 },
  sectionTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  actionsGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionCard: { flex: 1, alignItems: "center", gap: 6 },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: SIZES.xs, fontWeight: "600", color: COLORS.text },
  patAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + "15", alignItems: "center", justifyContent: "center" },
  patName: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  patDate: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
});
