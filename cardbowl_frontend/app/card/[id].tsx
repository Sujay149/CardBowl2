import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
} from "react-native";
import { shareCard } from "@/lib/export";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCards } from "@/context/CardsContext";
import { useProfile } from "@/context/ProfileContext";
import { VoiceNote, PitchResult } from "@/lib/storage";
import { generatePitchToThem, generatePitchFromThem } from "@/lib/ai";
import { GradeBar } from "@/components/GradeBar";
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useColors } from "@/hooks/useColors";

const CARD_BG = "#fbfbf6";
const CARD_BORDER = "#e0d6c8";
const NAVY = "#0f172a";
const COPPER = "#c4893f";
const COPPER_LIGHT = "#d4a05a";
const TEXT_DARK = "#0f172a";
const TEXT_MID = "#334155";
const TEXT_MUTED = "#64748b";

interface ECardData {
  id?: string;
  name?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  bio?: string;
  companyLogo?: string;
}

function ECardFront({
  profile,
  qrPayload,
  w,
  h,
}: {
  profile: ECardData;
  qrPayload: string;
  w: number;
  h: number;
}) {
  const circleD = h * 1.15;
  const circleRight = w * -0.16;
  const qrSize = Math.round(Math.min(w * 0.2, h * 0.42));
  const nameFontSize = Math.max(14, Math.round(w * 0.052));
  const roleFontSize = Math.max(9, Math.round(w * 0.028));
  const infoFontSize = Math.max(8, Math.round(w * 0.026));
  const iconSize = Math.max(8, Math.round(w * 0.026));
  const contentPadH = Math.round(w * 0.045);
  const contentPadV = Math.round(h * 0.1);
  const logoSize = Math.round(w * 0.085);

  const initials = profile.name
    ? profile.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "CB";

  const nameParts = (profile.name || "Unknown").split(" ");
  const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  return (
    <View style={[previewCardStyles.card, { width: w, height: h, backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}> 
      <View
        style={[
          previewCardStyles.halfCircle,
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

      <View
        style={[
          previewCardStyles.frontQrWrap,
          {
            right: Math.round(w * 0.06),
            top: (h - qrSize - 12) / 2,
          },
        ]}
      >
        <View style={previewCardStyles.qrBg}>
          <QRCode value={qrPayload || "cardbowl"} size={qrSize} backgroundColor="#fff" color={NAVY} ecl="L" />
        </View>
      </View>

      <View style={[previewCardStyles.frontContent, { paddingHorizontal: contentPadH, paddingVertical: contentPadV }]}> 
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Math.round(h * 0.06) }}>
          <View style={[previewCardStyles.logoCircle, { width: logoSize, height: logoSize, borderRadius: logoSize / 2, backgroundColor: NAVY }]}>
            {profile.companyLogo ? (
              <Image source={{ uri: profile.companyLogo }} style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }} resizeMode="cover" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: logoSize * 0.5 }}>{initials}</Text>
            )}
          </View>
          <View>
            <Text style={{ color: TEXT_DARK, fontSize: Math.max(7, w * 0.02), fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 }} numberOfLines={1}>
              {profile.company || "CARD CONTACT"}
            </Text>
            {profile.bio ? (
              <Text style={{ color: TEXT_MUTED, fontSize: Math.max(5, w * 0.015), textTransform: "uppercase", letterSpacing: 0.4 }} numberOfLines={1}>
                {profile.bio}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={{ fontSize: nameFontSize, color: TEXT_DARK }} numberOfLines={1}>
          <Text style={{ fontWeight: "400" }}>{firstName} </Text>
          <Text style={{ fontWeight: "900" }}>{lastName}</Text>
        </Text>

        <Text style={{ fontSize: roleFontSize, fontWeight: "500", color: TEXT_MID, marginBottom: Math.round(h * 0.04) }} numberOfLines={1}>
          {profile.title || "Contact"}
        </Text>

        <View style={{ gap: Math.round(h * 0.028) }}>
          {profile.phone ? (
            <View style={previewCardStyles.infoRow}>
              <Feather name="phone" size={iconSize} color={COPPER} />
              <Text style={{ fontSize: infoFontSize, color: TEXT_MID }} numberOfLines={1}>{profile.phone}</Text>
            </View>
          ) : null}
          {profile.email ? (
            <View style={previewCardStyles.infoRow}>
              <Feather name="mail" size={iconSize} color={COPPER} />
              <Text style={{ fontSize: infoFontSize, color: TEXT_MID }} numberOfLines={1}>{profile.email}</Text>
            </View>
          ) : null}
          {profile.website ? (
            <View style={previewCardStyles.infoRow}>
              <Feather name="globe" size={iconSize} color={COPPER} />
              <Text style={{ fontSize: infoFontSize, color: TEXT_MID }} numberOfLines={1}>{profile.website}</Text>
            </View>
          ) : null}
          {profile.address ? (
            <View style={previewCardStyles.infoRow}>
              <Feather name="map-pin" size={iconSize} color={COPPER} />
              <Text style={{ fontSize: infoFontSize, color: TEXT_MID, flex: 1 }} numberOfLines={2}>{profile.address}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ECardBack({
  profile,
  qrPayload,
  w,
  h,
}: {
  profile: ECardData;
  qrPayload: string;
  w: number;
  h: number;
}) {
  const circleD = h * 1.15;
  const circleLeft = w * -0.16;
  const logoSize = Math.round(w * 0.12);
  const qrSize = Math.round(Math.min(w * 0.22, h * 0.4));
  const companyFontSize = Math.max(8, Math.round(w * 0.024));

  const initials = profile.name
    ? profile.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "CB";

  return (
    <View style={[previewCardStyles.card, { width: w, height: h, backgroundColor: CARD_BG, borderColor: CARD_BORDER }]}> 
      <View
        style={[
          previewCardStyles.halfCircle,
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

      <View
        style={{
          position: "absolute",
          left: Math.round(w * 0.12),
          top: (h - qrSize - 10) / 2,
        }}
      >
        <View style={[previewCardStyles.backQrFrame, { backgroundColor: NAVY, padding: 5 }]}> 
          <QRCode value={qrPayload || "cardbowl"} size={qrSize} backgroundColor="#fff" color={NAVY} ecl="L" />
        </View>
      </View>

      <View
        style={{
          position: "absolute",
          right: Math.round(w * 0.09),
          top: h * 0.22,
          alignItems: "center",
          maxWidth: w * 0.5,
          gap: 8,
        }}
      >
        <View
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize / 2,
            overflow: "hidden",
            backgroundColor: NAVY,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {profile.companyLogo ? (
            <Image source={{ uri: profile.companyLogo }} style={{ width: logoSize, height: logoSize }} resizeMode="cover" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: logoSize * 0.42 }}>{initials}</Text>
          )}
        </View>
        <Text
          style={{
            color: TEXT_DARK,
            fontWeight: "800",
            fontSize: companyFontSize,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            textAlign: "center",
          }}
          numberOfLines={2}
        >
          {profile.company || "CardBowl Contact"}
        </Text>
        <Text style={{ color: TEXT_MUTED, fontSize: Math.max(7, w * 0.02), textAlign: "center" }} numberOfLines={2}>
          Scan to save this contact
        </Text>
      </View>
    </View>
  );
}

function PitchBlock({
  pitch,
  title,
  accentColor,
}: {
  pitch: PitchResult;
  title: string;
  accentColor: string;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const openLink = (url: string) => {
    if (!url) return;
    const href = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(href).catch(() => Alert.alert("Error", "Could not open link"));
  };

  return (
    <View
      style={[
        styles.pitchBlock,
        { backgroundColor: accentColor + "0d", borderColor: accentColor + "30" },
      ]}
    >
      <View style={styles.pitchBlockHeader}>
        <Text style={[styles.pitchBlockTitle, { color: accentColor }]}>{title}</Text>
        <Text style={[styles.pitchDate, { color: colors.mutedForeground }]}>
          {new Date(pitch.generatedAt).toLocaleDateString()}
        </Text>
      </View>

      {pitch.briefExplanation ? (
        <View style={[styles.briefBox, { backgroundColor: accentColor + "15" }]}>
          <Feather name="zap" size={13} color={accentColor} />
          <Text style={[styles.briefText, { color: accentColor }]}>
            {pitch.briefExplanation}
          </Text>
        </View>
      ) : null}

      <GradeBar grade={pitch.grade} label={pitch.gradeLabel} />

      <Text style={[styles.pitchText, { color: colors.foreground }]}>
        {pitch.text}
      </Text>

      {pitch.reasoning ? (
        <View style={[styles.reasoningBox, { backgroundColor: colors.muted }]}>
          <Text style={[styles.reasoningLabel, { color: colors.mutedForeground }]}>
            Why this grade
          </Text>
          <Text style={[styles.reasoningText, { color: colors.foreground }]}>
            {pitch.reasoning}
          </Text>
        </View>
      ) : null}

      {pitch.webInfo ? (
        <TouchableOpacity
          style={styles.webInfoToggle}
          onPress={() => setExpanded((v) => !v)}
        >
          <Feather name="globe" size={12} color={colors.mutedForeground} />
          <Text style={[styles.webInfoToggleText, { color: colors.mutedForeground }]}>
            {expanded ? "Hide" : "Show"} web research
          </Text>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={12}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>
      ) : null}

      {expanded && pitch.webInfo ? (
        <View style={[styles.webInfoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.webInfoText, { color: colors.foreground }]}>
            {pitch.webInfo}
          </Text>
          {pitch.webSources && pitch.webSources.length > 0 ? (
            <View style={styles.sourcesWrap}>
              {pitch.webSources.map((src, i) =>
                src.url ? (
                  <TouchableOpacity
                    key={i}
                    style={styles.sourceChip}
                    onPress={() => openLink(src.url)}
                  >
                    <Feather name="external-link" size={10} color={colors.primary} />
                    <Text
                      style={[styles.sourceText, { color: colors.primary }]}
                      numberOfLines={1}
                    >
                      {src.title || src.url}
                    </Text>
                  </TouchableOpacity>
                ) : null
              )}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function CardDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const { getCardById, addOrUpdateCard, removeCard } = useCards();
  const { profile } = useProfile();
  const card = getCardById(id);

  const [generatingPitch, setGeneratingPitch] = useState<"to-them" | "from-them" | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const cardWidth = useMemo(() => Math.min(Math.max(viewportWidth - 32, 280), 560), [viewportWidth]);
  const cardHeight = useMemo(() => Math.round(cardWidth * 0.56), [cardWidth]);

  const goBackOrCards = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  if (!card) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Card not found</Text>
        <TouchableOpacity onPress={goBackOrCards}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      await shareCard(card);
    } catch {
      Alert.alert("Error", "Could not share contact");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Card", `Remove ${card.name || "this card"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await removeCard(card.id);
          goBackOrCards();
        },
      },
    ]);
  };

  const generatePitch = async (type: "to-them" | "from-them") => {
    if (!profile) {
      Alert.alert(
        "Profile required",
        "Set up your profile first to generate pitches.",
        [
          { text: "Set up", onPress: () => router.push("/(tabs)/profile") },
          { text: "Cancel" },
        ]
      );
      return;
    }
    setGeneratingPitch(type);
    try {
      const result =
        type === "to-them"
          ? await generatePitchToThem(card, profile)
          : await generatePitchFromThem(card, profile);
      const updated = {
        ...card,
        [type === "to-them" ? "pitchToThem" : "pitchFromThem"]: result,
        updatedAt: new Date().toISOString(),
      };
      await addOrUpdateCard(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not generate pitch. Please check your API key.");
    } finally {
      setGeneratingPitch(null);
    }
  };

  const addVoiceNote = async (note: VoiceNote) => {
    const updated = {
      ...card,
      voiceNotes: [...card.voiceNotes, note],
      updatedAt: new Date().toISOString(),
    };
    await addOrUpdateCard(updated);
    setShowRecorder(false);
  };

  const deleteVoiceNote = async (noteId: string) => {
    const updated = {
      ...card,
      voiceNotes: card.voiceNotes.filter((n) => n.id !== noteId),
      updatedAt: new Date().toISOString(),
    };
    await addOrUpdateCard(updated);
  };

  const openLink = (url: string) => {
    if (!url) return;
    const href = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(href).catch(() => Alert.alert("Error", "Could not open link"));
  };

  const initials = card.name
    ? card.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const eCardData: ECardData = {
    id: card.id,
    name: card.name,
    title: card.title,
    company: card.company,
    email: card.email,
    phone: card.phone,
    website: card.website,
    address: card.address,
    bio: card.notes,
    companyLogo: card.imageFront,
  };

  const qrPayload = JSON.stringify({
    type: "cardbowl-connect",
    version: 1,
    generatedAt: new Date().toISOString(),
    user: {
      id: card.id,
      name: card.name || "",
      title: card.title || "",
      company: card.company || "",
      email: card.email || "",
      phone: card.phone || "",
      website: card.website || "",
      address: card.address || "",
      linkedin: card.linkedin || "",
      twitter: card.twitter || "",
      keywords: card.keywords || [],
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.navBar,
          { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={goBackOrCards}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
          {card.name || card.company || "Card"}
        </Text>
        <View style={styles.navActions}>
          <TouchableOpacity onPress={handleShare}>
            <Feather name="share-2" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/edit/${card.id}`)}>
            <Feather name="edit-2" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Feather name="trash-2" size={20} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
      >
        <View style={styles.eCardWrap}>
          <View style={{ alignItems: "flex-end" }}>
            <TouchableOpacity style={[styles.flipBtn, { backgroundColor: NAVY }]} onPress={() => setShowBack((v) => !v)}>
              <Feather name="refresh-cw" size={13} color={COPPER_LIGHT} />
              <Text style={[styles.flipBtnText, { color: COPPER_LIGHT }]}>Flip Card</Text>
            </TouchableOpacity>
          </View>
          {!showBack ? (
            <ECardFront profile={eCardData} qrPayload={qrPayload} w={cardWidth} h={cardHeight} />
          ) : (
            <ECardBack profile={eCardData} qrPayload={qrPayload} w={cardWidth} h={cardHeight} />
          )}
        </View>

        {/* Card Photos */}
        {(card.imageFront || card.imageBack) && (
          <View style={styles.imagesRow}>
            {card.imageFront && (
              <Image source={{ uri: card.imageFront }} style={styles.cardImage} resizeMode="cover" />
            )}
            {card.imageBack && (
              <Image source={{ uri: card.imageBack }} style={styles.cardImage} resizeMode="cover" />
            )}
          </View>
        )}

        {/* Contact */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contact</Text>
          {card.email ? (
            <TouchableOpacity style={styles.contactRow} onPress={() => openLink(`mailto:${card.email}`)}>
              <Feather name="mail" size={14} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.foreground }]}>{card.email}</Text>
            </TouchableOpacity>
          ) : null}
          {card.phone ? (
            <TouchableOpacity style={styles.contactRow} onPress={() => openLink(`tel:${card.phone}`)}>
              <Feather name="phone" size={14} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.foreground }]}>{card.phone}</Text>
            </TouchableOpacity>
          ) : null}
          {card.website ? (
            <TouchableOpacity style={styles.contactRow} onPress={() => openLink(card.website!)}>
              <Feather name="globe" size={14} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.primary }]}>{card.website}</Text>
            </TouchableOpacity>
          ) : null}
          {card.address ? (
            <View style={styles.contactRow}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.contactText, { color: colors.foreground }]}>{card.address}</Text>
            </View>
          ) : null}
          {card.orgLocation ? (
            <View style={styles.contactRow}>
              <Feather name="navigation" size={14} color={colors.mutedForeground} />
              <Text style={[styles.contactText, { color: colors.mutedForeground }]}>
                Org HQ: {card.orgLocation}
              </Text>
            </View>
          ) : null}
          {card.location ? (
            <View style={[styles.locationBlock, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={styles.contactRow}>
                <Feather name="map-pin" size={14} color={colors.success} />
                <Text style={[styles.contactText, { color: colors.foreground, fontWeight: "600" }]}>
                  Scanned at
                </Text>
              </View>
              {card.location.address ? (
                <Text style={[styles.locationAddr, { color: colors.foreground }]}>
                  {card.location.address}
                </Text>
              ) : null}
              <Text style={[styles.locationCoords, { color: colors.mutedForeground }]}>
                {card.location.latitude.toFixed(5)}, {card.location.longitude.toFixed(5)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Social */}
        {(card.linkedin || card.twitter || card.instagram) ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Social</Text>
            <View style={styles.socialRow}>
              {card.linkedin ? (
                <TouchableOpacity
                  style={[styles.socialBtn, { backgroundColor: "#0077b6" }]}
                  onPress={() => openLink(card.linkedin!)}
                >
                  <Feather name="linkedin" size={16} color="#fff" />
                  <Text style={styles.socialBtnText}>LinkedIn</Text>
                </TouchableOpacity>
              ) : null}
              {card.twitter ? (
                <TouchableOpacity
                  style={[styles.socialBtn, { backgroundColor: "#1da1f2" }]}
                  onPress={() => openLink(`https://twitter.com/${card.twitter?.replace("@", "")}`)}
                >
                  <Feather name="twitter" size={16} color="#fff" />
                  <Text style={styles.socialBtnText}>Twitter</Text>
                </TouchableOpacity>
              ) : null}
              {card.instagram ? (
                <TouchableOpacity
                  style={[styles.socialBtn, { backgroundColor: "#e1306c" }]}
                  onPress={() => openLink(`https://instagram.com/${card.instagram?.replace("@", "")}`)}
                >
                  <Feather name="instagram" size={16} color="#fff" />
                  <Text style={styles.socialBtnText}>Instagram</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Company Info */}
        {(card.orgDescription || card.decisionMakers?.length) ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Company Intel</Text>
            {card.orgDescription ? (
              <Text style={[styles.orgDesc, { color: colors.foreground }]}>{card.orgDescription}</Text>
            ) : null}
            {card.decisionMakers && card.decisionMakers.length > 0 ? (
              <View>
                <Text style={[styles.dmLabel, { color: colors.mutedForeground }]}>Key Decision Makers</Text>
                <View style={styles.dmWrap}>
                  {card.decisionMakers.map((dm, i) => (
                    <View key={i} style={[styles.dmChip, { backgroundColor: colors.accent }]}>
                      <Feather name="user" size={10} color={colors.primary} />
                      <Text style={[styles.dmText, { color: colors.primary }]}>{dm}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Keywords */}
        {card.keywords && card.keywords.length > 0 ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Keywords</Text>
            <View style={styles.kwWrap}>
              {card.keywords.map((kw, i) => (
                <View key={i} style={[styles.kwChip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.kwText, { color: colors.foreground }]}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* AI Pitch Generator */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>AI Pitch Generator</Text>
          <Text style={[styles.pitchSub, { color: colors.mutedForeground }]}>
            Powered by GPT-4o + live web research. Results saved with date so you can refresh anytime.
          </Text>

          <View style={styles.pitchBtnsRow}>
            <TouchableOpacity
              style={[
                styles.pitchBtn,
                { backgroundColor: generatingPitch === "to-them" ? colors.muted : colors.primary, flex: 1 },
              ]}
              onPress={() => generatePitch("to-them")}
              disabled={!!generatingPitch}
            >
              <Feather name="send" size={14} color="#fff" />
              <Text style={styles.pitchBtnText} numberOfLines={1}>
                {generatingPitch === "to-them"
                  ? "Researching..."
                  : card.pitchToThem
                  ? "Refresh: My Pitch"
                  : "My Pitch to Them"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pitchBtn,
                { backgroundColor: generatingPitch === "from-them" ? colors.muted : colors.navyMid, flex: 1 },
              ]}
              onPress={() => generatePitch("from-them")}
              disabled={!!generatingPitch}
            >
              <Feather name="refresh-cw" size={14} color="#fff" />
              <Text style={styles.pitchBtnText} numberOfLines={1}>
                {generatingPitch === "from-them"
                  ? "Researching..."
                  : card.pitchFromThem
                  ? "Refresh: Their Pitch"
                  : "Their Pitch to Me"}
              </Text>
            </TouchableOpacity>
          </View>

          {generatingPitch && (
            <View style={[styles.searchingBanner, { backgroundColor: colors.accent }]}>
              <Feather name="globe" size={13} color={colors.primary} />
              <Text style={[styles.searchingText, { color: colors.primary }]}>
                Searching the web for company info...
              </Text>
            </View>
          )}

          {card.pitchToThem && (
            <PitchBlock
              pitch={card.pitchToThem}
              title="My Pitch to Them"
              accentColor={colors.primary}
            />
          )}

          {card.pitchFromThem && (
            <PitchBlock
              pitch={card.pitchFromThem}
              title="Their Pitch to Me"
              accentColor={colors.navyMid}
            />
          )}
        </View>

        {/* Voice Notes */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.noteHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Voice Notes</Text>
            <TouchableOpacity
              style={[styles.addNoteBtn, { backgroundColor: colors.accent }]}
              onPress={() => setShowRecorder((v) => !v)}
            >
              <Feather name={showRecorder ? "x" : "plus"} size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {showRecorder && <VoiceRecorder onSave={addVoiceNote} />}

          {card.voiceNotes.length === 0 && !showRecorder ? (
            <Text style={[styles.emptyNotes, { color: colors.mutedForeground }]}>
              No voice notes yet. Tap + to record one.
            </Text>
          ) : null}

          {card.voiceNotes.map((note) => (
            <VoiceNotePlayer
              key={note.id}
              note={note}
              onDelete={() => deleteVoiceNote(note.id)}
            />
          ))}
        </View>

        {/* Text Notes */}
        {card.notes ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{card.notes}</Text>
          </View>
        ) : null}

        <Text style={[styles.savedAt, { color: colors.mutedForeground }]}>
          Saved {new Date(card.savedAt).toLocaleDateString()}
        </Text>
      </ScrollView>
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
  navTitle: { fontSize: 16, fontWeight: "600", flex: 1, textAlign: "center" },
  navActions: { flexDirection: "row", gap: 14 },
  content: { gap: 12, padding: 16 },
  eCardWrap: { gap: 10 },
  flipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  flipBtnText: { fontSize: 12, fontWeight: "700" },
  cardHeader: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  cardAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  avatarImg: { width: 72, height: 72 },
  avatarInitials: { fontSize: 28, fontWeight: "700", color: "#fff" },
  cardName: { fontSize: 22, fontWeight: "700" },
  cardTitle: { fontSize: 14, fontWeight: "500" },
  cardCompany: { fontSize: 15, fontWeight: "600" },
  categoryBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: { fontSize: 12, fontWeight: "500" },
  imagesRow: { flexDirection: "row", gap: 8 },
  cardImage: { flex: 1, height: 100, borderRadius: 10 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactText: { fontSize: 14, flex: 1 },
  locationBlock: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 4, marginTop: 4 },
  locationAddr: { fontSize: 13, fontWeight: "500", paddingLeft: 22 },
  locationCoords: { fontSize: 11, paddingLeft: 22 },
  socialRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  socialBtnText: { color: "#fff", fontSize: 13, fontWeight: "500" },
  orgDesc: { fontSize: 14, lineHeight: 22 },
  dmLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  dmWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dmChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dmText: { fontSize: 12, fontWeight: "500" },
  kwWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kwChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  kwText: { fontSize: 12 },
  pitchSub: { fontSize: 12, lineHeight: 18 },
  pitchBtnsRow: { flexDirection: "row", gap: 8 },
  pitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  pitchBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  searchingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  searchingText: { fontSize: 13 },
  pitchBlock: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  pitchBlockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pitchBlockTitle: { fontSize: 14, fontWeight: "700" },
  pitchDate: { fontSize: 11 },
  briefBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  briefText: { fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 18 },
  pitchText: { fontSize: 14, lineHeight: 22 },
  reasoningBox: { borderRadius: 8, padding: 10, gap: 4 },
  reasoningLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  reasoningText: { fontSize: 13, lineHeight: 18 },
  webInfoToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  webInfoToggleText: { fontSize: 12, flex: 1 },
  webInfoBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  webInfoText: { fontSize: 12, lineHeight: 18 },
  sourcesWrap: { gap: 4 },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sourceText: { fontSize: 11, flex: 1 },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addNoteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNotes: { fontSize: 13 },
  notesText: { fontSize: 14, lineHeight: 22 },
  savedAt: { fontSize: 12, textAlign: "center" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18, fontWeight: "600" },
  backLink: { fontSize: 16, fontWeight: "500" },
});

const previewCardStyles = StyleSheet.create({
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
