import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useWalletContext } from "../../context/WalletContext";
import { doctorAPI, accessAPI } from "../../services/api";
import { grantAccessOnChain, revokeAccessOnChain, checkAccess } from "../../services/blockchain";
import { Button, Card, Badge } from "../../components/common";
import { COLORS, SIZES } from "../../utils/theme";

export default function DoctorDetailScreen({ route, navigation }) {
  const { doctorId } = route.params;
  const { user } = useAuth();
  const { privateKey, hasWallet } = useWalletContext();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    fetchDoctor();
  }, []);

  const fetchDoctor = async () => {
    try {
      const res = await doctorAPI.getById(doctorId);
      setDoctor(res.data.data);

      // Check on-chain access
      if (user?.walletAddress && res.data.data?.walletAddress) {
        const access = await checkAccess(user.walletAddress, res.data.data.walletAddress);
        setHasAccess(access);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load doctor details");
    }
    setLoading(false);
  };

  const handleGrantAccess = async () => {
    setActionLoading(true);
    try {
      let chainResult = null;

      // 1. On-chain grant access
      if (hasWallet && privateKey && doctor?.walletAddress) {
        const duration = 30 * 24 * 60 * 60; // 30 days
        const allowedTypes = [0, 1, 2, 3, 4, 5, 6, 7]; // All record types

        chainResult = await grantAccessOnChain(
          privateKey,
          doctor.walletAddress,
          "ReadOnly",
          duration,
          allowedTypes,
          "Patient granted access via MedChain App"
        );

        if (!chainResult.success) {
          console.warn("On-chain grant failed:", chainResult.message);
        }
      }

      // 2. Backend grant
      await accessAPI.grantAccess({
        doctorId,
        accessLevel: "ReadOnly",
        duration: 30,
        purpose: "Medical consultation",
        recordTypes: ["all"],
      });

      const msg = chainResult?.success
        ? `Access granted!\n\nBackend ✅\nBlockchain ✅\nTx: ${chainResult.txHash.slice(0, 20)}...`
        : "Access granted!\n\nBackend ✅\nBlockchain: Skipped";

      Alert.alert("Success 🎉", msg);
      setHasAccess(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message);
    }
    setActionLoading(false);
  };

  const handleRevokeAccess = async () => {
    Alert.alert("Revoke Access", `Remove ${doctor?.name}'s access to your records?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            let chainResult = null;

            // 1. On-chain revoke
            if (hasWallet && privateKey && doctor?.walletAddress) {
              chainResult = await revokeAccessOnChain(privateKey, doctor.walletAddress);
              if (!chainResult.success) {
                console.warn("On-chain revoke failed:", chainResult.message);
              }
            }

            // 2. Backend revoke
            await accessAPI.revokeAccess({ doctorId });

            const msg = chainResult?.success
              ? `Access revoked!\n\nBackend ✅\nBlockchain ✅`
              : "Access revoked!\n\nBackend ✅";

            Alert.alert("Done", msg);
            setHasAccess(false);
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || err.message);
          }
          setActionLoading(false);
        },
      },
    ]);
  };

  const handleRate = async (stars) => {
    setRating(stars);
    try {
      await doctorAPI.rate(doctorId, { rating: stars });
      Alert.alert("Thanks!", `You rated Dr. ${doctor?.name} ${stars}/5 stars`);
      fetchDoctor();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Rating failed");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Doctor not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Header */}
        <Card>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={COLORS.white} />
            </View>
            <Text style={styles.name}>{doctor.name}</Text>
            <Text style={styles.specialization}>{doctor.specialization || "General"}</Text>
            {doctor.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.verifiedText}>Verified Doctor</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Info */}
        <Card>
          <Text style={styles.sectionTitle}>Professional Info</Text>
          <View style={styles.infoRow}>
            <Ionicons name="medkit" size={18} color={COLORS.primary} />
            <Text style={styles.infoLabel}>License:</Text>
            <Text style={styles.infoValue}>{doctor.licenseNumber || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="star" size={18} color={COLORS.warning} />
            <Text style={styles.infoLabel}>Rating:</Text>
            <Text style={styles.infoValue}>{doctor.rating?.toFixed(1) || "0"} ({doctor.ratingCount || 0} reviews)</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={18} color={COLORS.info} />
            <Text style={styles.infoLabel}>Patients:</Text>
            <Text style={styles.infoValue}>{doctor.totalPatients || 0}</Text>
          </View>
          {doctor.walletAddress && (
            <View style={styles.infoRow}>
              <Ionicons name="wallet" size={18} color={COLORS.secondary} />
              <Text style={styles.infoLabel}>Wallet:</Text>
              <Text style={[styles.infoValue, { fontFamily: "monospace", fontSize: 11 }]}>{doctor.walletAddress.slice(0, 12)}...{doctor.walletAddress.slice(-6)}</Text>
            </View>
          )}
        </Card>

        {/* Contact */}
        {(doctor.email || doctor.phone) && (
          <Card>
            <Text style={styles.sectionTitle}>Contact</Text>
            {doctor.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={18} color={COLORS.success} />
                <Text style={styles.infoValue}>{doctor.phone}</Text>
              </View>
            )}
            {doctor.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={18} color={COLORS.primary} />
                <Text style={styles.infoValue}>{doctor.email}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Rating */}
        <Card>
          <Text style={styles.sectionTitle}>Rate This Doctor</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => handleRate(s)}>
                <Ionicons name={s <= rating ? "star" : "star-outline"} size={32} color={COLORS.warning} />
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Access Control */}
        <Card>
          <Text style={styles.sectionTitle}>Record Access</Text>

          {hasAccess ? (
            <View>
              <View style={styles.accessActive}>
                <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.accessTitle}>Access Granted</Text>
                  <Text style={styles.accessDesc}>This doctor can view your records</Text>
                </View>
              </View>
              <Button title="Revoke Access" onPress={handleRevokeAccess} loading={actionLoading} variant="danger" icon="close-circle-outline" style={{ marginTop: 12 }} />
            </View>
          ) : (
            <View>
              <Text style={styles.accessDesc}>Grant this doctor read-only access to your medical records for 30 days.</Text>

              {hasWallet && (
                <Text style={styles.chainReady}>✅ Access will be recorded on blockchain</Text>
              )}
              {!hasWallet && (
                <Text style={styles.chainWarning}>⚠️ Set private key in Blockchain Registration for on-chain access</Text>
              )}

              <Button title="Grant Record Access (30 Days)" onPress={handleGrantAccess} loading={actionLoading} icon="shield-checkmark-outline" style={{ marginTop: 12 }} />
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: SIZES.md, color: COLORS.textSecondary },
  profileHeader: { alignItems: "center", paddingVertical: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text },
  specialization: { fontSize: SIZES.md, color: COLORS.primary, marginTop: 4 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, backgroundColor: COLORS.success + "15", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { fontSize: SIZES.sm, color: COLORS.success, fontWeight: "600" },
  sectionTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary, width: 70 },
  infoValue: { fontSize: SIZES.sm, color: COLORS.text, fontWeight: "500", flex: 1 },
  starRow: { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 8 },
  accessActive: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.success + "10", padding: 12, borderRadius: 12 },
  accessTitle: { fontSize: SIZES.md, fontWeight: "700", color: COLORS.success },
  accessDesc: { fontSize: SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  chainReady: { fontSize: SIZES.xs, color: COLORS.success, marginTop: 8 },
  chainWarning: { fontSize: SIZES.xs, color: COLORS.warning, marginTop: 8 },
});