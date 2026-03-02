import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doctorAPI, accessAPI } from "../../services/api";
import { Card, Badge, Button } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function DoctorDetailScreen({ route, navigation }) {
  const { doctor } = route.params;
  const [rating, setRating] = useState(0);
  const [grantLoading, setGrantLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  const handleGrantAccess = async () => {
    setGrantLoading(true);
    try {
      await accessAPI.grant({
        doctorId: doctor._id,
        accessLevel: "ReadOnly",
        duration: 2592000,
        allowedRecordTypes: [0, 1, 2, 3, 4, 5, 6, 7],
        purpose: "Medical consultation",
      });
      Alert.alert("Success", `Access granted to Dr. ${doctor.name} for 30 days`);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed");
    }
    setGrantLoading(false);
  };

  const handleRate = async (stars) => {
    setRating(stars);
    setRateLoading(true);
    try {
      await doctorAPI.rate(doctor._id, stars);
      Alert.alert("Thanks!", `You rated Dr. ${doctor.name} ${stars}/5 stars`);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Rating failed");
    }
    setRateLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{doctor.name?.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{doctor.name}</Text>
        <Badge label={doctor.specialization || "General"} variant="info" />
        {doctor.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.ratingText}>{doctor.rating.toFixed(1)}/5 ({doctor.ratingCount} ratings)</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Card>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{doctor.phone || "Not provided"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{doctor.email}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="card-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>License: {doctor.licenseNumber || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{doctor.totalPatients || 0} patients</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Rate this Doctor</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name={s <= rating ? "star" : "star-outline"} size={32}
                color={s <= rating ? "#f59e0b" : COLORS.textLight}
                onPress={() => handleRate(s)} />
            ))}
          </View>
        </Card>

        <Button title="Grant Record Access (30 days)" onPress={handleGrantAccess} loading={grantLoading} icon="shield-checkmark-outline" style={{ marginTop: 4 }} />

        <Button title="Revoke Access" onPress={() => {
          Alert.alert("Revoke", `Revoke Dr. ${doctor.name}'s access?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Revoke", style: "destructive", onPress: async () => {
              try {
                await accessAPI.revoke({ doctorId: doctor._id });
                Alert.alert("Done", "Access revoked");
              } catch (err) {
                Alert.alert("Error", err.response?.data?.message || "Failed");
              }
            }},
          ]);
        }} variant="danger" icon="close-circle-outline" style={{ marginTop: 8, marginBottom: 40 }} />
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
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  ratingText: { fontSize: SIZES.md, color: COLORS.textSecondary },
  content: { padding: 20 },
  sectionTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  infoGrid: { gap: 14 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: SIZES.md, color: COLORS.text },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
});