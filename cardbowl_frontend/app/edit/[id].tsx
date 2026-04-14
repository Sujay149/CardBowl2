import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCards } from "@/context/CardsContext";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon?: string;
  multiline?: boolean;
}

function Field({ label, value, onChangeText, placeholder, icon, multiline }: FieldProps) {
  const colors = useColors();
  return (
    <View style={fStyles.wrap}>
      <Text style={[fStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[fStyles.input, { backgroundColor: colors.muted, borderColor: colors.border }, multiline && { alignItems: "flex-start" }]}>
        {icon && <Feather name={icon as any} size={13} color={colors.mutedForeground} />}
        <TextInput
          style={[fStyles.text, { color: colors.foreground }, multiline && { height: 72, textAlignVertical: "top" }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

const fStyles = StyleSheet.create({
  wrap: { gap: 3 },
  label: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9, gap: 7 },
  text: { flex: 1, fontSize: 14 },
});

export default function EditCardScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getCardById, addOrUpdateCard } = useCards();
  const card = getCardById(id);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const goBackOrCards = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const [form, setForm] = useState({
    name: card?.name || "",
    title: card?.title || "",
    company: card?.company || "",
    email: card?.email || "",
    phone: card?.phone || "",
    website: card?.website || "",
    address: card?.address || "",
    linkedin: card?.linkedin || "",
    twitter: card?.twitter || "",
    instagram: card?.instagram || "",
    notes: card?.notes || "",
    keywords: card?.keywords?.join(", ") || "",
    category: card?.category || "",
    orgDescription: card?.orgDescription || "",
    decisionMakers: card?.decisionMakers?.join(", ") || "",
  });

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const save = async () => {
    if (!card) return;
    const updated = {
      ...card,
      ...form,
      keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      decisionMakers: form.decisionMakers.split(",").map((d) => d.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    await addOrUpdateCard(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goBackOrCards();
  };

  if (!card) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.foreground }]}>Card not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBackOrCards}>
          <Feather name="x" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Edit Card</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={save}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.groupTitle, { color: colors.primary }]}>Personal</Text>
        <Field label="Full Name" value={form.name} onChangeText={set("name")} placeholder="Jane Doe" icon="user" />
        <Field label="Job Title" value={form.title} onChangeText={set("title")} placeholder="CEO..." icon="briefcase" />
        <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="jane@company.com" icon="mail" />
        <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="+1 234..." icon="phone" />

        <Text style={[styles.groupTitle, { color: colors.primary }]}>Company</Text>
        <Field label="Company" value={form.company} onChangeText={set("company")} placeholder="Acme Inc" icon="home" />
        <Field label="Website" value={form.website} onChangeText={set("website")} placeholder="https://..." icon="globe" />
        <Field label="Address" value={form.address} onChangeText={set("address")} placeholder="City, Country" icon="map-pin" />
        <Field label="Category / Industry" value={form.category} onChangeText={set("category")} placeholder="Technology, Healthcare..." />
        <Field label="About the Org" value={form.orgDescription} onChangeText={set("orgDescription")} placeholder="What does the company do?" multiline />

        <Text style={[styles.groupTitle, { color: colors.primary }]}>Social</Text>
        <Field label="LinkedIn" value={form.linkedin} onChangeText={set("linkedin")} placeholder="linkedin.com/in/..." icon="linkedin" />
        <Field label="Twitter / X" value={form.twitter} onChangeText={set("twitter")} placeholder="@..." icon="twitter" />
        <Field label="Instagram" value={form.instagram} onChangeText={set("instagram")} placeholder="@..." icon="instagram" />

        <Text style={[styles.groupTitle, { color: colors.primary }]}>Metadata</Text>
        <Field label="Keywords (comma-separated)" value={form.keywords} onChangeText={set("keywords")} placeholder="SaaS, B2B, logistics..." />
        <Field label="Key Decision Makers (comma-separated)" value={form.decisionMakers} onChangeText={set("decisionMakers")} placeholder="CEO Jane, CTO John..." />

        <Text style={[styles.groupTitle, { color: colors.primary }]}>Notes</Text>
        <Field label="Text Notes" value={form.notes} onChangeText={set("notes")} placeholder="Additional context..." multiline />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navTitle: { fontSize: 16, fontWeight: "600" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  content: { padding: 16, gap: 10 },
  groupTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
});
