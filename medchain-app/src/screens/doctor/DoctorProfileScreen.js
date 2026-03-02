import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { Card, Badge } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function DoctorProfileScreen() {
  const { user } = useAuth();

  const statusMap = { 0: ["Not Applied", "warning"], 1: ["Pending", "info"], 2: ["Verified", "success"], 3: ["Rejected", "danger"], 4: ["Suspended", "danger"] };
  const [statusLabel, statusVariant] = statusMap[user?.onChainStatus] || ["Unknown", "default"];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Badge label={user?.specialization || "Specialist"} variant="info" />
      </View>

      <View style={styles.content}>
        <Card>
          <Text style={styles.sectionTitle}>Verification Status</Text>
          <View style={styles.row}>
            <Text style={styles.label}>On-Chain Status</Text>
            <Badge label={statusLabel} variant={statusVariant} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Platform Verified</Text>
            <Badge label={user?.isVerified ? "Yes" : "No"} variant={user?.isVerified ? "success" : "warning"} />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Professional Info</Text>
          <View style={styles.infoItem}>
            <Ionicons name="medical-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Specialization: {user?.specialization || "—"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="card-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>License: {user?.licenseNumber || "—"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Total Patients: {user?.totalPatients || 0}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="star-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Rating: {user?.rating ? `${user.rating.toFixed(1)}/5 (${user.ratingCount})` : "No ratings yet"}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{user?.phone || "Not provided"}</Text>
          </View>
          {user?.walletAddress && (
            <View style={styles.infoItem}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{user.walletAddress.slice(0, 10)}...{user.walletAddress.slice(-6)}</Text>
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { alignItems: "center", paddingTop: 24, paddingBottom: 20, backgroundColor: COLORS.white },
  avatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.secondary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: "700", color: COLORS.white },
  name: { fontSize: SIZES.xxl, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  content: { padding: 20 },
  sectionTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: SIZES.md, color: COLORS.textSecondary },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  infoText: { fontSize: SIZES.md, color: COLORS.text },
});