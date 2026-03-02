import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { Card, Badge } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: "wallet-outline", label: user?.walletAddress ? "Wallet Connected" : "Connect Wallet", screen: "ConnectWallet" },
    { icon: "person-outline", label: "Edit Profile", screen: "EditProfile" },
    { icon: "shield-checkmark-outline", label: "Access Permissions", screen: "Access" },
    { icon: "notifications-outline", label: "Notifications", screen: "Notifications" },
    { icon: "lock-closed-outline", label: "Change Password", screen: "ChangePassword" },
    { icon: "information-circle-outline", label: "About MedChain AI", screen: null },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || "?"}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Badge label={user?.role?.toUpperCase()} variant={user?.role === "doctor" ? "info" : "success"} />
      </View>

      <View style={styles.infoGrid}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoValue}>{user?.totalRecords || 0}</Text>
          <Text style={styles.infoLabel}>Records</Text>
        </Card>
        <Card style={styles.infoCard}>
          <Text style={styles.infoValue}>{user?.bloodType || "—"}</Text>
          <Text style={styles.infoLabel}>Blood Type</Text>
        </Card>
        <Card style={styles.infoCard}>
          <Text style={styles.infoValue}>{user?.role === "doctor" ? (user?.rating?.toFixed(1) || "N/A") : (user?.totalPatients || "0")}</Text>
          <Text style={styles.infoLabel}>{user?.role === "doctor" ? "Rating" : "Visits"}</Text>
        </Card>
      </View>

      {user?.walletAddress && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.walletLabel}>Wallet Connected</Text>
              <Text style={styles.walletAddr}>{user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}</Text>
            </View>
            <Badge label="Sepolia" variant="info" />
          </View>
        </Card>
      )}

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem}
            onPress={() => item.screen && navigation.navigate(item.screen)} activeOpacity={0.7}>
            <Ionicons name={item.icon} size={20} color={COLORS.textSecondary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>MedChain AI v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
  header: { alignItems: "center", paddingTop: 20, marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: "700", color: COLORS.white },
  name: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text },
  email: { fontSize: SIZES.md, color: COLORS.textSecondary, marginBottom: 8 },
  infoGrid: { flexDirection: "row", gap: 10, marginBottom: 12 },
  infoCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
  infoValue: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text },
  infoLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  walletLabel: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.text },
  walletAddr: { fontSize: SIZES.xs, color: COLORS.textSecondary, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  menu: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, marginTop: 12, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLabel: { flex: 1, fontSize: SIZES.md, fontWeight: "500", color: COLORS.text },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20, paddingVertical: 16, backgroundColor: COLORS.white, borderRadius: SIZES.radius },
  logoutText: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.danger },
  version: { textAlign: "center", fontSize: SIZES.xs, color: COLORS.textLight, marginTop: 16, marginBottom: 40 },
});
