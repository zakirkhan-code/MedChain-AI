import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { recordAPI } from "../../services/api";
import { Button, Input, Card } from "../../components/common";
import { COLORS, SIZES, RECORD_TYPES } from "../../utils/theme";
import { TouchableOpacity } from "react-native";

export default function AddRecordScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recordType, setRecordType] = useState("LabReport");
  const [dataFields, setDataFields] = useState([{ key: "", value: "" }]);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const addField = () => setDataFields([...dataFields, { key: "", value: "" }]);

  const updateField = (index, field, value) => {
    const updated = [...dataFields];
    updated[index][field] = value;
    setDataFields(updated);
  };

  const removeField = (index) => {
    if (dataFields.length === 1) return;
    setDataFields(dataFields.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return Alert.alert("Error", "Title and description are required");

    const data = {};
    dataFields.forEach((f) => { if (f.key.trim()) data[f.key.trim()] = f.value.trim(); });

    setLoading(true);
    try {
      await recordAPI.create({
        title: title.trim(),
        description: description.trim(),
        recordType,
        data,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      Alert.alert("Success", "Record created successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create record");
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Input label="Title *" icon="document-text-outline" placeholder="e.g. Blood Test Report" value={title} onChangeText={setTitle} />
        <Input label="Description *" icon="information-circle-outline" placeholder="Brief description of the record" value={description} onChangeText={setDescription} multiline numberOfLines={3} />

        <Text style={styles.label}>Record Type</Text>
        <View style={styles.typeGrid}>
          {RECORD_TYPES.map((type) => (
            <TouchableOpacity key={type} onPress={() => setRecordType(type)}
              style={[styles.typeChip, recordType === type && styles.typeChipActive]} activeOpacity={0.7}>
              <Text style={[styles.typeText, recordType === type && { color: COLORS.white }]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.label}>Data Fields</Text>
          <TouchableOpacity onPress={addField}>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {dataFields.map((field, index) => (
          <Card key={index} style={styles.fieldCard}>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Input placeholder="Field name (e.g. Hemoglobin)" value={field.key} onChangeText={(v) => updateField(index, "key", v)} containerStyle={{ marginBottom: 8 }} />
                <Input placeholder="Value (e.g. 14.5 g/dL)" value={field.value} onChangeText={(v) => updateField(index, "value", v)} containerStyle={{ marginBottom: 0 }} />
              </View>
              {dataFields.length > 1 && (
                <TouchableOpacity onPress={() => removeField(index)} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}

        <Input label="Tags (comma separated)" icon="pricetags-outline" placeholder="blood-test, annual-checkup" value={tags} onChangeText={setTags} />

        <Button title="Create Record" onPress={handleSubmit} loading={loading} icon="cloud-upload-outline" style={{ marginTop: 8, marginBottom: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },
  label: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.textSecondary },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  fieldCard: { padding: 12 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  removeBtn: { padding: 8, marginTop: 8 },
});