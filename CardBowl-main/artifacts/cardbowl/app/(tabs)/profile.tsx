import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/context/ProfileContext";
import { UserProfile, generateId } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { shareMyCard } from "@/lib/export";
import { createProfileQrPayload } from "@/lib/qr";

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  icon?: string;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  icon,
}: FieldProps) {
  const colors = useColors();
  return (
    <View style={fieldStyles.container}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View
        style={[
          fieldStyles.inputWrap,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
          },
        ]}
      >
        {icon && (
          <Feather name={icon as any} size={14} color={colors.mutedForeground} />
        )}
        <TextInput
          style={[
            fieldStyles.input,
            { color: colors.foreground },
            multiline && { height: 80, textAlignVertical: "top" },
          ]}
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

const fieldStyles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: { flex: 1, fontSize: 14 },
});

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const qrPayload = useMemo(
    () => (profile ? createProfileQrPayload(profile) : ""),
    [profile]
  );

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const startEdit = () => {
    setForm(
      profile || {
        id: generateId(),
        name: "",
        title: "",
        company: "",
        email: "",
        phone: "",
        website: "",
        linkedin: "",
        twitter: "",
        address: "",
        bio: "",
        products: "",
        services: "",
        keywords: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
    setEditing(true);
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      Alert.alert("Name required", "Please enter your name");
      return;
    }
    const updated = { ...form, updatedAt: new Date().toISOString() };
    await updateProfile(updated);
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const set = (field: keyof UserProfile) => (value: string) => {
    setForm((f) => (f ? { ...f, [field]: value } : f));
  };

  const setKeywords = (text: string) => {
    setForm((f) =>
      f
        ? {
            ...f,
            keywords: text
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
          }
        : f
    );
  };

  if (!profile && !editing) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: colors.background, paddingTop: topPad + 40 },
        ]}
      >
        <Feather name="user" size={60} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Your Business Card
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Set up your profile so CardBowl can generate personalized pitches for
          your contacts.
        </Text>
        <TouchableOpacity
          style={[styles.setupBtn, { backgroundColor: colors.primary }]}
          onPress={startEdit}
        >
          <Feather name="edit-2" size={16} color="#fff" />
          <Text style={styles.setupBtnText}>Set Up Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (editing && form) {
    return (
      <KeyboardAwareScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.editContent,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.editHeader}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Edit Profile
          </Text>
          <View style={styles.editActions}>
            <TouchableOpacity
              onPress={() => setEditing(false)}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.groupTitle, { color: colors.primary }]}>
            Personal
          </Text>
          <Field label="Full Name" value={form.name} onChangeText={set("name")} placeholder="John Smith" icon="user" />
          <Field label="Title / Role" value={form.title} onChangeText={set("title")} placeholder="CEO, Sales Manager..." icon="briefcase" />
          <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="you@company.com" icon="mail" />
          <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="+1 234 567 8900" icon="phone" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.groupTitle, { color: colors.primary }]}>
            Company
          </Text>
          <Field label="Company Name" value={form.company} onChangeText={set("company")} placeholder="Acme Corp" icon="home" />
          <Field label="Website" value={form.website} onChangeText={set("website")} placeholder="https://company.com" icon="globe" />
          <Field label="Address" value={form.address} onChangeText={set("address")} placeholder="123 Main St, City, Country" icon="map-pin" />
          <Field label="About / Bio" value={form.bio} onChangeText={set("bio")} placeholder="Brief description..." multiline />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.groupTitle, { color: colors.primary }]}>
            Products & Services
          </Text>
          <Field label="Products" value={form.products} onChangeText={set("products")} placeholder="What do you sell?" multiline />
          <Field label="Services" value={form.services} onChangeText={set("services")} placeholder="What services do you offer?" multiline />
          <Field
            label="Keywords (comma-separated)"
            value={form.keywords?.join(", ") || ""}
            onChangeText={setKeywords}
            placeholder="SaaS, B2B, healthcare..."
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.groupTitle, { color: colors.primary }]}>
            Social
          </Text>
          <Field label="LinkedIn" value={form.linkedin} onChangeText={set("linkedin")} placeholder="linkedin.com/in/you" icon="linkedin" />
          <Field label="Twitter / X" value={form.twitter} onChangeText={set("twitter")} placeholder="@yourtag" icon="twitter" />
        </View>
      </KeyboardAwareScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          My Profile
        </Text>
        <TouchableOpacity
          style={[styles.editBtn, { borderColor: colors.border }]}
          onPress={startEdit}
        >
          <Feather name="edit-2" size={14} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.cardPreview,
          { backgroundColor: colors.navy, borderColor: colors.navyMid },
        ]}
      >
        <Text style={[styles.cardName, { color: "#fff" }]}>
          {profile?.name}
        </Text>
        <Text style={[styles.cardTitle, { color: colors.gold }]}>
          {profile?.title}
        </Text>
        <Text style={[styles.cardCompany, { color: "#94a3b8" }]}>
          {profile?.company}
        </Text>
        <View style={styles.cardContact}>
          {profile?.email ? (
            <Text style={[styles.cardInfo, { color: "#cbd5e1" }]}>
              {profile.email}
            </Text>
          ) : null}
          {profile?.phone ? (
            <Text style={[styles.cardInfo, { color: "#cbd5e1" }]}>
              {profile.phone}
            </Text>
          ) : null}
          {profile?.website ? (
            <Text style={[styles.cardInfo, { color: "#cbd5e1" }]}>
              {profile.website}
            </Text>
          ) : null}
        </View>
      </View>

      {profile && (
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: colors.accent, borderColor: colors.primary + "40" }]}
          onPress={async () => {
            try {
              await shareMyCard(profile);
            } catch {
              Alert.alert("Error", "Could not share your card");
            }
          }}
        >
          <Feather name="share-2" size={16} color={colors.primary} />
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share My Card</Text>
        </TouchableOpacity>
      )}

      {profile ? (
        <View
          style={[
            styles.qrSection,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My QR</Text>
          <Text style={[styles.qrSub, { color: colors.mutedForeground }]}>Let someone scan this to connect and exchange cards instantly.</Text>
          <View style={[styles.qrBox, { backgroundColor: "#fff" }]}>
            <QRCode value={qrPayload} size={180} />
          </View>
          <TouchableOpacity
            style={[styles.scanConnectBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/scan", params: { mode: "connect" } })}
          >
            <Feather name="camera" size={16} color="#fff" />
            <Text style={styles.scanConnectText}>Scan Someone Else&apos;s QR</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {profile?.products || profile?.services ? (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Products & Services
          </Text>
          {profile?.products ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Products</Text>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                {profile.products}
              </Text>
            </View>
          ) : null}
          {profile?.services ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Services</Text>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                {profile.services}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {profile?.keywords && profile.keywords.length > 0 ? (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Keywords
          </Text>
          <View style={styles.kwWrap}>
            {profile.keywords.map((kw, i) => (
              <View
                key={i}
                style={[styles.kwChip, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.kwText, { color: colors.primary }]}>
                  {kw}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  editContent: { paddingHorizontal: 16, gap: 16 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  setupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  setupBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "800" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtnText: { fontWeight: "500", fontSize: 14 },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  qrSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  qrSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  qrBox: {
    borderRadius: 12,
    padding: 12,
  },
  scanConnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scanConnectText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  shareBtnText: { fontSize: 15, fontWeight: "600" },
  cardPreview: {
    borderRadius: 16,
    padding: 24,
    gap: 4,
    borderWidth: 1,
  },
  cardName: { fontSize: 22, fontWeight: "700" },
  cardTitle: { fontSize: 14, fontWeight: "500" },
  cardCompany: { fontSize: 15, fontWeight: "600", marginTop: 4 },
  cardContact: { marginTop: 10, gap: 2 },
  cardInfo: { fontSize: 13 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  fieldValue: { fontSize: 14, lineHeight: 20 },
  kwWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kwChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  kwText: { fontSize: 12, fontWeight: "500" },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editActions: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelText: { fontSize: 14 },
  saveBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  fieldGroup: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  groupTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
});
