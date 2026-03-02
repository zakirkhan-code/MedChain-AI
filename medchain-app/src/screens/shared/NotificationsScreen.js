import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { notificationAPI } from "../../services/api";
import { Loader, EmptyState } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll({ page: 1, limit: 50 });
      setNotifications(res.data.data.notifications || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const iconMap = {
    access_request: { name: "key", color: COLORS.warning },
    access_granted: { name: "shield-checkmark", color: COLORS.success },
    access_revoked: { name: "close-circle", color: COLORS.danger },
    verification: { name: "checkmark-circle", color: COLORS.info },
    record_added: { name: "document-text", color: COLORS.purple },
    system: { name: "settings", color: COLORS.textSecondary },
    appointment: { name: "calendar", color: COLORS.primary },
    ai_alert: { name: "sparkles", color: COLORS.purple },
  };

  const renderItem = ({ item }) => {
    const { name: iconName, color } = iconMap[item.type] || iconMap.system;
    return (
      <TouchableOpacity style={[styles.item, !item.read && styles.unread]} onPress={() => markRead(item._id)} activeOpacity={0.7}>
        <View style={[styles.iconWrap, { backgroundColor: color + "15" }]}>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.msg} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  if (loading) return <Loader />;

  return (
    <FlatList
      style={styles.container}
      data={notifications}
      renderItem={renderItem}
      keyExtractor={(i) => i._id}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="No notifications" subtitle="You're all caught up!" />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: COLORS.white, borderRadius: SIZES.radius, marginBottom: 8 },
  unread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  msg: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  time: { fontSize: SIZES.xs, color: COLORS.textLight, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
});
