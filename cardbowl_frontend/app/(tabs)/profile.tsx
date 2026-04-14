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
  Image,
  useWindowDimensions,
  Share,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/context/ProfileContext";
import { UserProfile, generateId } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { shareMyCard } from "@/lib/export";
import { createProfileQrPayload } from "@/lib/qr";
import { generateQrSvgString } from "@/lib/qrSvg";

/* ─── palette used on the physical card ─── */
const CARD_BG = "#fbfbf6";
const CARD_BORDER = "#e0d6c8";
const NAVY = "#0f172a";
const COPPER = "#c4893f";
const COPPER_LIGHT = "#d4a05a";
const TEXT_DARK = "#0f172a";
const TEXT_MID = "#334155";
const TEXT_MUTED = "#64748b";

/* ────────── Field (edit mode) ────────── */
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  icon?: string;
}

function Field({ label, value, onChangeText, placeholder, multiline, icon }: FieldProps) {
  const colors = useColors();
  return (
    <View style={fieldStyles.container}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View
        style={[fieldStyles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        {icon && <Feather name={icon as any} size={14} color={colors.mutedForeground} />}
        <TextInput
          style={[fieldStyles.input, { color: colors.foreground }, multiline && { height: 80, textAlignVertical: "top" }]}
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

/* ────────── E-Card Front ────────── */
function ECardFront({
  profile,
  qrPayload,
  w,
  h,
}: {
  profile: UserProfile;
  qrPayload: string;
  w: number;
  h: number;
}) {
  // All dimensions scale from card width
  const circleD = h * 1.15;            // navy circle diameter
  const ringD = circleD * 1.12;        // copper ring diameter
  const circleRight = w * -0.16;       // navy circle offset from right
  const ringRight = circleRight - (ringD - circleD) * 0.35;

  const logoSize = Math.round(w * 0.085);
  const qrSize = Math.round(Math.min(w * 0.2, h * 0.42));
  const nameFontSize = Math.max(14, Math.round(w * 0.052));
  const roleFontSize = Math.max(9, Math.round(w * 0.028));
  const infoFontSize = Math.max(8, Math.round(w * 0.026));
  const iconSize = Math.max(8, Math.round(w * 0.026));
  const contentPadH = Math.round(w * 0.045);
  const contentPadV = Math.round(h * 0.1);

  const initials = profile.name
    ? profile.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "CB";

  const nameParts = (profile.name || "Your Name").split(" ");
  const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  return (
    <View style={[cardStyles.card, { width: w, height: h, backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
      {/* Navy half-circle */}
      <View
        style={[
          cardStyles.halfCircle,
          {
            width: circleD,
            height: circleD,
            borderRadius: circleD / 2,
            backgroundColor: NAVY,
            right: circleRight,
            top: (h - circleD) / 2,
          },
        ]}
      />

      {/* QR code — centered on the navy circle visible area */}
      <View
        style={[
          cardStyles.frontQrWrap,
          {
            right: Math.round(w * 0.06),
            top: (h - qrSize - 12) / 2,
          },
        ]}
      >
        <View style={cardStyles.qrBg}>
          <QRCode value={qrPayload || "cardbowl"} size={qrSize} backgroundColor="#fff" color={NAVY} ecl="L" />
        </View>
      </View>

      {/* LEFT content */}
      <View style={[cardStyles.frontContent, { paddingHorizontal: contentPadH, paddingVertical: contentPadV }]}>
        {/* Logo top-left */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Math.round(h * 0.06) }}>
          <View style={[cardStyles.logoCircle, { width: logoSize, height: logoSize, borderRadius: logoSize / 2, backgroundColor: NAVY }]}>
            {profile.companyLogo ? (
              <Image source={{ uri: profile.companyLogo }} style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }} resizeMode="cover" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: logoSize * 0.5 }}>{initials}</Text>
            )}
          </View>
          <View>
            <Text style={{ color: TEXT_DARK, fontSize: Math.max(7, w * 0.02), fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 }} numberOfLines={1}>
              {profile.company || "COMPANY LOGO"}
            </Text>
            {profile.bio ? (
              <Text style={{ color: TEXT_MUTED, fontSize: Math.max(5, w * 0.015), textTransform: "uppercase", letterSpacing: 0.4 }} numberOfLines={1}>
                {profile.bio}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Name */}
        <Text style={{ fontSize: nameFontSize, color: TEXT_DARK }} numberOfLines={1}>
          <Text style={{ fontWeight: "400" }}>{firstName} </Text>
          <Text style={{ fontWeight: "900" }}>{lastName}</Text>
        </Text>

        {/* Role */}
        <Text style={{ fontSize: roleFontSize, fontWeight: "500", color: TEXT_MID, marginBottom: Math.round(h * 0.04) }} numberOfLines={1}>
          {profile.title || "Your Role"}
        </Text>

        {/* Contact rows */}
        <View style={{ gap: Math.round(h * 0.028) }}>
          {profile.phone ? (
            <View style={cardStyles.infoRow}>
              <Feather name="phone" size={iconSize} color={COPPER} />
              <Text style={{ fontSize: infoFontSize, color: TEXT_MID }} numberOfLines={1}>{profile.phone}</Text>
            </View>
          ) : null}
          {profile.email ? (
            <View style={cardStyles.infoRow}>
              <Feather name="mail" size={iconSize} color={COPPER} />
              <Text style={{ fontSize: infoFontSize, color: TEXT_MID }} numberOfLines={1}>{profile.email}</Text>
            </View>
          ) : null}
          {profile.website ? (
            <View style={cardStyles.infoRow}>
              <Feather name="globe" size={iconSize} color={COPPER} />
              <Text style={{ fontSize: infoFontSize, color: TEXT_MID }} numberOfLines={1}>{profile.website}</Text>
            </View>
          ) : null}
          {profile.address ? (
            <View style={cardStyles.infoRow}>
              <Feather name="map-pin" size={iconSize} color={COPPER} />
              <Text style={{ fontSize: infoFontSize, color: TEXT_MID, flex: 1 }} numberOfLines={2}>{profile.address}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/* ────────── E-Card Back ────────── */
function ECardBack({
  profile,
  qrPayload,
  w,
  h,
}: {
  profile: UserProfile;
  qrPayload: string;
  w: number;
  h: number;
}) {
  const circleD = h * 1.15;
  const ringD = circleD * 1.12;
  const circleLeft = w * -0.16;
  const ringLeft = circleLeft - (ringD - circleD) * 0.35;

  const logoSize = Math.round(w * 0.12);
  const qrSize = Math.round(Math.min(w * 0.22, h * 0.4));
  const companyFontSize = Math.max(8, Math.round(w * 0.024));

  const initials = profile.name
    ? profile.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "CB";

  return (
    <View style={[cardStyles.card, { width: w, height: h, backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}>
      {/* Navy half-circle – LEFT side */}
      <View
        style={[
          cardStyles.halfCircle,
          {
            width: circleD,
            height: circleD,
            borderRadius: circleD / 2,
            backgroundColor: NAVY,
            left: circleLeft,
            top: (h - circleD) / 2,
          },
        ]}
      />

      {/* Logo + company centered on the navy area */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: w * 0.42,
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <View style={[cardStyles.logoCircle, { width: logoSize, height: logoSize, borderRadius: logoSize / 2, backgroundColor: "#fff" }]}>
          {profile.companyLogo ? (
            <Image source={{ uri: profile.companyLogo }} style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }} resizeMode="cover" />
          ) : (
            <Text style={{ color: NAVY, fontWeight: "900", fontSize: logoSize * 0.45 }}>{initials}</Text>
          )}
        </View>
        <Text style={{ color: "#fff", fontSize: companyFontSize, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, textAlign: "center" }} numberOfLines={1}>
          {profile.company || "COMPANY LOGO"}
        </Text>
        {profile.bio ? (
          <Text style={{ color: "#94a3b8", fontSize: Math.max(6, w * 0.016), textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }} numberOfLines={1}>
            {profile.bio}
          </Text>
        ) : null}
      </View>

      {/* RIGHT content – QR + contact summary */}
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: w * 0.52,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {/* Small company logo top-right */}
        <View style={{ position: "absolute", top: Math.round(h * 0.08), right: Math.round(w * 0.04), flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={[cardStyles.logoCircle, { width: w * 0.05, height: w * 0.05, borderRadius: w * 0.025, backgroundColor: NAVY }]}>
            {profile.companyLogo ? (
              <Image source={{ uri: profile.companyLogo }} style={{ width: w * 0.05, height: w * 0.05, borderRadius: w * 0.025 }} resizeMode="cover" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: w * 0.02 }}>{initials}</Text>
            )}
          </View>
        </View>

        {/* QR with copper border */}
        <View style={[cardStyles.backQrFrame, { borderColor: COPPER_LIGHT, padding: Math.round(w * 0.012), borderWidth: Math.max(2, w * 0.006) }]}>
          <View style={cardStyles.qrBg}>
            <QRCode value={qrPayload || "cardbowl"} size={qrSize} backgroundColor="#fff" color={NAVY} ecl="L" />
          </View>
        </View>
        <Text style={{ color: TEXT_MUTED, fontSize: Math.max(7, w * 0.02) }}>Scan to save my contact</Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 0,
    alignSelf: "center",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  ring: {
    position: "absolute",
    borderWidth: 14,
  },
  halfCircle: {
    position: "absolute",
  },
  frontContent: {
    flex: 1,
    justifyContent: "center",
    maxWidth: "58%",
  },
  frontQrWrap: {
    position: "absolute",
    zIndex: 2,
  },
  qrBg: {
    backgroundColor: "#fff",
    padding: 4,
    borderRadius: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoCircle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  backQrFrame: {
    borderRadius: 10,
  },
});

/* ────────── Main Screen ────────── */
export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [form, setForm] = useState<UserProfile | null>(null);
  const { width: viewportWidth } = useWindowDimensions();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const qrPayload = useMemo(() => (profile ? createProfileQrPayload(profile) : ""), [profile]);

  const cardWidth = useMemo(() => Math.min(Math.max(viewportWidth - 32, 280), 560), [viewportWidth]);
  const cardHeight = useMemo(() => Math.round(cardWidth * 0.56), [cardWidth]);

  const [sharing, setSharing] = useState(false);

  const shareECard = async () => {
    if (!profile) return;

    if (Platform.OS === "web") {
      await shareMyCard(profile);
      return;
    }

    setSharing(true);
    try {
      const Print = await import("expo-print");
      const Sharing = await import("expo-sharing");

      const nameParts = (profile.name || "Your Name").split(" ");
      const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const initials = profile.name
        ? profile.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
        : "CB";

      // Generate real QR code SVGs
      const qrSvgFront = generateQrSvgString(qrPayload || "cardbowl", 88, "#0f172a", "#ffffff");
      const qrSvgBack = generateQrSvgString(qrPayload || "cardbowl", 100, "#0f172a", "#ffffff");

      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const contactRows = [
        profile.phone && `<div class="info-row"><span class="icon">&#9742;</span> ${esc(profile.phone)}</div>`,
        profile.email && `<div class="info-row"><span class="icon">&#9993;</span> ${esc(profile.email)}</div>`,
        profile.website && `<div class="info-row"><span class="icon">&#127760;</span> ${esc(profile.website)}</div>`,
        profile.address && `<div class="info-row"><span class="icon">&#128205;</span> ${esc(profile.address)}</div>`,
      ].filter(Boolean).join("\n");

      const socialRows = [
        profile.linkedin && `<div class="info-row">LinkedIn: ${esc(profile.linkedin)}</div>`,
        profile.twitter && `<div class="info-row">Twitter: ${esc(profile.twitter)}</div>`,
      ].filter(Boolean).join("\n");

      const logoHtml = (size: number, _bg: string, fg: string) =>
        profile.companyLogo
          ? `<img src="${profile.companyLogo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;" />`
          : `<span style="color:${fg};font-weight:900;font-size:${Math.round(size * 0.45)}px;">${initials}</span>`;

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background: #fff; padding: 20px; }
  .page-title { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .card { width: 540px; height: 306px; border-radius: 16px; position: relative; overflow: hidden; background: #fbfbf6; margin: 0 auto 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .half-circle { position: absolute; border-radius: 50%; background: #0f172a; }
  .ring { position: absolute; border-radius: 50%; border: 14px solid #c4893f; }

  .front .half-circle { width: 352px; height: 352px; right: -86px; top: -23px; }
  .front .ring { width: 394px; height: 394px; right: -108px; top: -44px; }
  .front .content { position: relative; z-index: 1; padding: 28px 0 28px 28px; max-width: 58%; height: 100%; display: flex; flex-direction: column; justify-content: center; }
  .front .logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .logo-dot { width: 36px; height: 36px; border-radius: 50%; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
  .front .company-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #0f172a; }
  .front .bio-label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; }
  .front .name { font-size: 26px; color: #0f172a; line-height: 1.1; }
  .front .name .first { font-weight: 400; }
  .front .name .last { font-weight: 900; }
  .front .role { font-size: 13px; color: #334155; font-weight: 500; margin-bottom: 10px; }
  .info-row { font-size: 11px; color: #334155; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
  .info-row .icon { color: #c4893f; font-size: 12px; width: 16px; text-align: center; flex-shrink: 0; }
  .front .qr-wrap { position: absolute; z-index: 2; right: 32px; top: 50%; transform: translateY(-50%); background: #fff; padding: 6px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

  .back .half-circle { width: 352px; height: 352px; left: -86px; top: -23px; }
  .back .ring { width: 394px; height: 394px; left: -108px; top: -44px; }
  .back .navy-content { position: absolute; left: 0; top: 0; bottom: 0; width: 42%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; z-index: 1; }
  .logo-big { width: 52px; height: 52px; border-radius: 50%; background: #fff; color: #0f172a; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .back .company-big { color: #fff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; text-align: center; }
  .back .bio-big { color: #94a3b8; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
  .back .right-content { position: absolute; right: 0; top: 0; bottom: 0; width: 52%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; z-index: 1; }
  .back .qr-frame { border: 3px solid #d4a05a; border-radius: 10px; padding: 6px; background: #fff; }
  .back .hint { font-size: 9px; color: #64748b; }
  .mini-logo { position: absolute; top: 16px; right: 20px; width: 22px; height: 22px; border-radius: 50%; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; }

  .social-section { margin-top: 6px; font-size: 10px; color: #64748b; }
  .label { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 16px; }
</style></head><body>

<p class="page-title">${esc(profile.name || "My")} &mdash; Business Card</p>

<!-- FRONT -->
<p class="label">Front</p>
<div class="card front">
  <div class="ring"></div>
  <div class="half-circle"></div>
  <div class="qr-wrap">${qrSvgFront}</div>
  <div class="content">
    <div class="logo-row">
      <div class="logo-dot">${logoHtml(36, "#0f172a", "#fff")}</div>
      <div>
        <div class="company-label">${esc(profile.company || "COMPANY")}</div>
        ${profile.bio ? `<div class="bio-label">${esc(profile.bio)}</div>` : ""}
      </div>
    </div>
    <div class="name"><span class="first">${esc(firstName)} </span><span class="last">${esc(lastName)}</span></div>
    <div class="role">${esc(profile.title || "")}</div>
    ${contactRows}
    ${socialRows ? `<div class="social-section">${socialRows}</div>` : ""}
  </div>
</div>

<!-- BACK -->
<p class="label">Back</p>
<div class="card back">
  <div class="ring"></div>
  <div class="half-circle"></div>
  <div class="navy-content">
    <div class="logo-big">${logoHtml(52, "#fff", "#0f172a")}</div>
    <div class="company-big">${esc(profile.company || "COMPANY")}</div>
    ${profile.bio ? `<div class="bio-big">${esc(profile.bio)}</div>` : ""}
  </div>
  <div class="right-content">
    <div class="mini-logo">${logoHtml(22, "#0f172a", "#fff")}</div>
    <div class="qr-frame">${qrSvgBack}</div>
    <div class="hint">Scan to save my contact</div>
  </div>
</div>

</body></html>`;

      const LegacyFS = await import("expo-file-system/legacy");
      const { uri: tmpUri } = await Print.printToFileAsync({ html, width: 595, height: 842 });

      // Rename to {username}_CardBowl.pdf
      const safeName = (profile.name || "User").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
      const finalPath = `${LegacyFS.cacheDirectory}${safeName}_CardBowl.pdf`;
      await LegacyFS.moveAsync({ from: tmpUri, to: finalPath });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(finalPath, {
          mimeType: "application/pdf",
          dialogTitle: `${profile.name || "My"} E-Card`,
          UTI: "com.adobe.pdf",
        });
      } else {
        await Share.share({
          title: `${profile.name || "My"} Business Card`,
          url: finalPath,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e?.message?.includes("User did not share")) return;
      Alert.alert("Share failed", "Could not generate card PDF. Try again.");
    } finally {
      setSharing(false);
    }
  };

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
        companyLogo: "",
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

  const pickCompanyLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo library access to upload a logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      set("companyLogo")(result.assets[0].uri);
    }
  };

  /* ─── Empty state ─── */
  if (!profile && !editing) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background, paddingTop: topPad + 40 }]}>
        <Feather name="user" size={60} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your Business Card</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Set up your profile so CardBowl can generate personalized pitches for your contacts.
        </Text>
        <TouchableOpacity style={[styles.setupBtn, { backgroundColor: colors.primary }]} onPress={startEdit}>
          <Feather name="edit-2" size={16} color="#fff" />
          <Text style={styles.setupBtnText}>Set Up Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: colors.navy, borderColor: colors.gold + "50" }]}
          onPress={() => router.push("/import-card")}
        >
          <Feather name="credit-card" size={16} color={colors.gold} />
          <Text style={[styles.importBtnText, { color: colors.gold }]}>Import from Your Card</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ─── Edit mode ─── */
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
          <Text style={[styles.title, { color: colors.foreground }]}>Edit Profile</Text>
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => setEditing(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.groupTitle, { color: colors.primary }]}>Personal</Text>
          <Field label="Full Name" value={form.name} onChangeText={set("name")} placeholder="John Smith" icon="user" />
          <Field label="Title / Role" value={form.title} onChangeText={set("title")} placeholder="CEO, Sales Manager..." icon="briefcase" />
          <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="you@company.com" icon="mail" />
          <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="+1 234 567 8900" icon="phone" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.groupTitle, { color: colors.primary }]}>Company</Text>
          <Field label="Company Name" value={form.company} onChangeText={set("company")} placeholder="Acme Corp" icon="home" />
          <View style={styles.logoUploadWrap}>
            <Text style={[styles.logoUploadLabel, { color: colors.mutedForeground }]}>Company Logo</Text>
            <View style={styles.logoUploadRow}>
              <TouchableOpacity style={[styles.logoUploadBtn, { backgroundColor: colors.navy }]} onPress={pickCompanyLogo}>
                <Feather name="upload" size={14} color={colors.gold} />
                <Text style={[styles.logoUploadBtnText, { color: colors.gold }]}>Upload Logo</Text>
              </TouchableOpacity>
              {!!form.companyLogo && (
                <TouchableOpacity style={[styles.logoRemoveBtn, { borderColor: colors.border }]} onPress={() => set("companyLogo")("")}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.logoRemoveBtnText, { color: colors.destructive }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            {!!form.companyLogo && (
              <View style={[styles.logoPreviewWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Image source={{ uri: form.companyLogo }} style={styles.logoPreview} resizeMode="contain" />
              </View>
            )}
          </View>
          <Field label="Company Logo URL" value={form.companyLogo || ""} onChangeText={set("companyLogo")} placeholder="https://yourcompany.com/logo.png" icon="image" />
          <Field label="Website" value={form.website} onChangeText={set("website")} placeholder="https://company.com" icon="globe" />
          <Field label="Address" value={form.address} onChangeText={set("address")} placeholder="123 Main St, City, Country" icon="map-pin" />
          <Field label="About / Bio" value={form.bio} onChangeText={set("bio")} placeholder="Brief description or tagline..." multiline />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.groupTitle, { color: colors.primary }]}>Products & Services</Text>
          <Field label="Products" value={form.products} onChangeText={set("products")} placeholder="What do you sell?" multiline />
          <Field label="Services" value={form.services} onChangeText={set("services")} placeholder="What services do you offer?" multiline />
          <Field label="Keywords (comma-separated)" value={form.keywords?.join(", ") || ""} onChangeText={setKeywords} placeholder="SaaS, B2B, healthcare..." />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.groupTitle, { color: colors.primary }]}>Social</Text>
          <Field label="LinkedIn" value={form.linkedin} onChangeText={set("linkedin")} placeholder="linkedin.com/in/you" icon="linkedin" />
          <Field label="Twitter / X" value={form.twitter} onChangeText={set("twitter")} placeholder="@yourtag" icon="twitter" />
        </View>
      </KeyboardAwareScrollView>
    );
  }

  /* ─── Profile view ─── */
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
        <Text style={[styles.title, { color: colors.foreground }]}>My Profile</Text>
        <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]} onPress={startEdit}>
          <Feather name="edit-2" size={14} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* ── E-Card ── */}
      <View style={styles.eCardWrap}>
        <View style={styles.eCardTopBar}>
          <Text style={[styles.eCardLabel, { color: colors.mutedForeground }]}>
            {showBack ? "Back Side" : "Front Side"}
          </Text>
          <TouchableOpacity style={[styles.flipBtn, { backgroundColor: NAVY }]} onPress={() => setShowBack((v) => !v)}>
            <Feather name="refresh-cw" size={13} color={COPPER_LIGHT} />
            <Text style={[styles.flipBtnText, { color: COPPER_LIGHT }]}>Flip Card</Text>
          </TouchableOpacity>
        </View>

        {!showBack ? (
          <ECardFront profile={profile!} qrPayload={qrPayload} w={cardWidth} h={cardHeight} />
        ) : (
          <ECardBack profile={profile!} qrPayload={qrPayload} w={cardWidth} h={cardHeight} />
        )}
      </View>

      {/* Action buttons */}
      {profile && (
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: colors.accent, borderColor: colors.primary + "40" }]}
          onPress={shareECard}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="share-2" size={16} color={colors.primary} />
          )}
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>
            {sharing ? "Preparing card..." : "Share My E-Card"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.importBtn, { backgroundColor: colors.navy, borderColor: colors.gold + "50" }]}
        onPress={() => router.push("/import-card")}
      >
        <Feather name="credit-card" size={16} color={colors.gold} />
        <Text style={[styles.importBtnText, { color: colors.gold }]}>Import from Your Card</Text>
      </TouchableOpacity>

      {/* QR section */}
      {profile ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center" }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My QR</Text>
          <Text style={[styles.qrSub, { color: colors.mutedForeground }]}>
            Let someone scan this to connect and exchange cards instantly.
          </Text>
          <View style={[styles.qrBox, { backgroundColor: "#fff" }]}>
            <QRCode value={qrPayload} size={180} ecl="L" />
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

      {/* Products & Services */}
      {profile?.products || profile?.services ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Products & Services</Text>
          {profile?.products ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Products</Text>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>{profile.products}</Text>
            </View>
          ) : null}
          {profile?.services ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Services</Text>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>{profile.services}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Keywords */}
      {profile?.keywords && profile.keywords.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Keywords</Text>
          <View style={styles.kwWrap}>
            {profile.keywords.map((kw, i) => (
              <View key={i} style={[styles.kwChip, { backgroundColor: colors.accent }]}>
                <Text style={[styles.kwText, { color: colors.primary }]}>{kw}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareBtnText: { fontSize: 15, fontWeight: "600" },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  importBtnText: { fontSize: 15, fontWeight: "700" },
  eCardWrap: { gap: 10 },
  eCardTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eCardLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  flipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  flipBtnText: { fontSize: 12, fontWeight: "700" },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  qrSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  qrBox: { borderRadius: 12, padding: 12 },
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
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
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
  logoUploadWrap: { gap: 8 },
  logoUploadLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  logoUploadRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  logoUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logoUploadBtnText: { fontSize: 13, fontWeight: "700" },
  logoRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logoRemoveBtnText: { fontSize: 13, fontWeight: "700" },
  logoPreviewWrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoPreview: { width: "100%", height: 72 },
});
