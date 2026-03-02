import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { authAPI } from "../../services/api";
import { Button, Input } from "../../components/common";
import { COLORS } from "../../utils/theme";

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!currentPassword || !newPassword) return Alert.alert("Error", "Fill all fields");
    if (newPassword.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return Alert.alert("Error", "Passwords don't match");

    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      Alert.alert("Success", "Password changed!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed");
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Input label="Current Password" icon="lock-closed-outline" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <Input label="New Password" icon="lock-open-outline" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Min 6 characters" />
        <Input label="Confirm Password" icon="checkmark-circle-outline" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <Button title="Change Password" onPress={handleChange} loading={loading} icon="key-outline" style={{ marginTop: 8 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },
});