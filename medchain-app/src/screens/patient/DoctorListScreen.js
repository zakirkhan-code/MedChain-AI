import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doctorAPI } from "../../services/api";
import { Card, Badge, Loader, EmptyState, Input } from "../../components/common";
import { COLORS, SIZES, SPECIALIZATIONS } from "../../utils/theme";

export default function DoctorListScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("");

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 50 };
      if (specFilter) params.specialization = specFilter;
      const res = await doctorAPI.list(params);
      setDoctors(res.data.data.doctors || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchDoctors(); }, [specFilter]);

  const filtered = doctors.filter((d) =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(search.toLowerCase())
  );

  const renderDoctor = ({ item }) => (
    <Card onPress={() => navigation.navigate("DoctorDetail", { id: item._id, doctor: item })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.spec}>{item.specialization || "General"}</Text>
          {item.rating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)} ({item.ratingCount})</Text>
            </View>
          )}
        </View>
        <Badge label="Verified" variant="success" />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Input placeholder="Search doctors..." icon="search-outline" value={search} onChangeText={setSearch} containerStyle={{ marginBottom: 0 }} />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={["All", ...SPECIALIZATIONS.slice(0, 10)]}
          keyExtractor={(i) => i}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSpecFilter(item === "All" ? "" : item)}
              style={[styles.filterChip, (item === "All" ? !specFilter : specFilter === item) && styles.filterChipActive]}>
              <Text style={[styles.filterText, (item === "All" ? !specFilter : specFilter === item) && { color: COLORS.white }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? <Loader /> : (
        <FlatList
          data={filtered}
          renderItem={renderDoctor}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState icon="medkit-outline" title="No doctors found" subtitle="Try changing your search or filter" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBar: { padding: 16, paddingBottom: 8, backgroundColor: COLORS.white },
  filterRow: { paddingVertical: 8, paddingHorizontal: 8, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.bg, marginHorizontal: 4 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.textSecondary },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.secondary + "15", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.secondary },
  name: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  spec: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ratingText: { fontSize: SIZES.xs, color: COLORS.textSecondary },
});