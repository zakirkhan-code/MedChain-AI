import React from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../utils/theme";

export function Button({ title, onPress, loading, variant = "primary", icon, style, disabled }) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      style={[
        styles.btn,
        isPrimary && { backgroundColor: COLORS.primary },
        isOutline && { backgroundColor: "transparent", borderWidth: 1.5, borderColor: COLORS.primary },
        isDanger && { backgroundColor: COLORS.danger },
        (loading || disabled) && { opacity: 0.6 },
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.primary : COLORS.white} size="small" />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon && <Ionicons name={icon} size={18} color={isOutline ? COLORS.primary : COLORS.white} />}
          <Text style={[styles.btnText, isOutline && { color: COLORS.primary }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function Input({ label, icon, error, containerStyle, ...props }) {
  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && { borderColor: COLORS.danger }]}>
        {icon && <Ionicons name={icon} size={18} color={COLORS.textLight} style={{ marginRight: 10 }} />}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textLight}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.8} style={[styles.card, style]}>
      {children}
    </Wrapper>
  );
}

export function Badge({ label, variant = "default" }) {
  const colorMap = {
    default: { bg: "#f1f5f9", text: "#64748b" },
    success: { bg: "#ecfdf5", text: "#059669" },
    warning: { bg: "#fffbeb", text: "#d97706" },
    danger: { bg: "#fef2f2", text: "#dc2626" },
    info: { bg: "#eff6ff", text: "#2563eb" },
    purple: { bg: "#f5f3ff", text: "#7c3aed" },
  };
  const c = colorMap[variant] || colorMap.default;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

export function Loader({ text }) {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {text && <Text style={styles.loaderText}>{text}</Text>}
    </View>
  );
}

export function EmptyState({ icon = "document-text-outline", title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={COLORS.textLight} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 50, borderRadius: SIZES.radius, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  btnText: { color: COLORS.white, fontSize: SIZES.base, fontWeight: "600" },
  label: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.text, marginBottom: 6 },
  inputWrapper: { flexDirection: "row", alignItems: "center", height: 50, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius, paddingHorizontal: 14, backgroundColor: COLORS.white },
  input: { flex: 1, fontSize: SIZES.md, color: COLORS.text },
  errorText: { fontSize: SIZES.xs, color: COLORS.danger, marginTop: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: SIZES.radiusLg, padding: SIZES.padding, ...SHADOWS.md, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  badgeText: { fontSize: SIZES.xs, fontWeight: "600" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  loaderText: { marginTop: 12, color: COLORS.textSecondary, fontSize: SIZES.md },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: "600", color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, marginTop: 4, textAlign: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.text },
  sectionAction: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.primary },
});
