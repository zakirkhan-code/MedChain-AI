import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { aiAPI } from "../../services/api";
import { COLORS, SIZES } from "../../utils/theme";

export default function AIChatScreen() {
  const [messages, setMessages] = useState([
    { id: "0", role: "assistant", content: "Hello! I'm your MedChain AI health assistant. How can I help you today? 🏥" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef();

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { id: Date.now().toString(), role: "user", content: input.trim() };
    const history = messages.filter((m) => m.id !== "0").map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await aiAPI.chat({ message: userMsg.content, conversationHistory: history });
      const aiMsg = { id: (Date.now() + 1).toString(), role: "assistant", content: res.data.data.reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    }
    setLoading(false);
  };

  const quickPrompts = [
    "Check my symptoms",
    "Drug interactions",
    "Health tips",
    "Explain my report",
  ];

  const renderMessage = ({ item }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser && { justifyContent: "flex-end" }]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="pulse" size={16} color={COLORS.primary} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.msgText, isUser && { color: COLORS.white }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListHeaderComponent={
          messages.length <= 1 ? (
            <View style={styles.quickSection}>
              <Text style={styles.quickTitle}>Try asking:</Text>
              <View style={styles.quickGrid}>
                {quickPrompts.map((p) => (
                  <TouchableOpacity key={p} style={styles.quickChip} onPress={() => { setInput(p); }}>
                    <Text style={styles.quickText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
      />

      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.aiAvatar}><Ionicons name="pulse" size={14} color={COLORS.primary} /></View>
          <Text style={styles.typingText}>AI is thinking...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your health..."
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity onPress={sendMessage} disabled={!input.trim() || loading}
          style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]}>
          <Ionicons name="send" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  chatList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end", gap: 8 },
  aiAvatar: { width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.primary + "15", alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "78%", padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4 },
  msgText: { fontSize: SIZES.md, lineHeight: 20, color: COLORS.text },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  typingText: { fontSize: SIZES.sm, color: COLORS.textSecondary, fontStyle: "italic" },
  quickSection: { marginBottom: 20, alignItems: "center" },
  quickTitle: { fontSize: SIZES.md, color: COLORS.textSecondary, marginBottom: 12 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  quickText: { fontSize: SIZES.sm, color: COLORS.primary, fontWeight: "500" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: 12, paddingBottom: Platform.OS === "ios" ? 28 : 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10 },
  input: { flex: 1, maxHeight: 100, minHeight: 44, backgroundColor: COLORS.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: SIZES.md, color: COLORS.text },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
});
