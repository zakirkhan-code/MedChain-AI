import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { authAPI, patientAPI } from "../../services/api";
import { Button, Input } from "../../components/common";
import { COLORS } from "../../utils/theme";

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bloodType, setBloodType] = useState(user?.bloodType || "");
  const [allergies, setAllergies] = useState(user?.allergies || "");
  const [emergName, setEmergName] = useState(user?.emergencyContact?.name || "");
  const [emergPhone, setEmergPhone] = useState(user?.emergencyContact?.phone || "");
  const [emergRelation, setEmergRelation] = useState(user?.emergencyContact?.relationship || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await authAPI.updateProfile({ name: name.trim(), phone });
      
      if (user?.role === "patient") {
        await patientAPI.updateEmergencyInfo({
          bloodType, allergies,
          emergencyContact: { name: emergName, phone: emergPhone, relationship: emergRelation },
        });
      }

      updateUser({ name: name.trim(), phone, bloodType, allergies,
        emergencyContact: { name: emergName, phone: emergPhone, relationship: emergRelation } });
      Alert.alert("Success", "Profile updated!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Update failed");
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Input label="Full Name" icon="person-outline" value={name} onChangeText={setName} />
        <Input label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        {user?.role === "patient" && (
          <>
            <Input label="Blood Type" icon="water-outline" placeholder="e.g. O+" value={bloodType} onChangeText={setBloodType} />
            <Input label="Allergies" icon="alert-circle-outline" placeholder="e.g. Penicillin, Aspirin" value={allergies} onChangeText={setAllergies} />
            <Input label="Emergency Contact Name" icon="people-outline" value={emergName} onChangeText={setEmergName} />
            <Input label="Emergency Contact Phone" icon="call-outline" value={emergPhone} onChangeText={setEmergPhone} keyboardType="phone-pad" />
            <Input label="Relationship" icon="heart-outline" placeholder="e.g. Brother, Father" value={emergRelation} onChangeText={setEmergRelation} />
          </>
        )}

        <Button title="Save Changes" onPress={handleSave} loading={loading} icon="checkmark-circle-outline" style={{ marginTop: 8, marginBottom: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },
});