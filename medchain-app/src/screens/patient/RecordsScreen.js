import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { recordAPI } from "../../services/api";
import { Card, Badge, Loader, EmptyState } from "../../components/common";
import { COLORS, SIZES, RECORD_TYPES } from "../../utils/theme";

export default function RecordsScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter !== "All") params.recordType = filter;
      const res = await recordAPI.getMyRecords(params);
      setRecords(res.data.data.records || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [filter, page]);

  const typeIcons = { LabReport: "flask", Prescription: "document-text", Imaging: "scan", Diagnosis: "analytics", Vaccination: "bandage", Surgery: "cut", Discharge: "exit", Other: "ellipsis-horizontal" };

  const renderRecord = ({ item }) => (
    <Card onPress={() => navigation.navigate("RecordDetail", { id: item._id })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.icon, { backgroundColor: COLORS.info + "15" }]}>
          <Ionicons name={typeIcons[item.recordType] || "document"} size={20} color={COLORS.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()} • v{item.version}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Badge label={item.recordType} variant="info" />
          <Badge label={item.status} variant={item.status === "Active" ? "success" : item.status === "Amended" ? "warning" : "default"} />
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={["All", ...RECORD_TYPES]}
          keyExtractor={(i) => i}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => { setFilter(item); setPage(1); }}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}>
              <Text style={[styles.filterText, filter === item && { color: COLORS.white }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? <Loader /> : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<EmptyState title="No records" subtitle="Add your first medical record" />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("AddRecord")} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  filterRow: { paddingVertical: 12, paddingHorizontal: 8, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bg, marginHorizontal: 4 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.textSecondary },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  date: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
