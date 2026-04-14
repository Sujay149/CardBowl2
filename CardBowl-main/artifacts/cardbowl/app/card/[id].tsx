import React, { useState } from "react";
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
} from "react-native";
import { shareCard } from "@/lib/export";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCards } from "@/context/CardsContext";
import { useProfile } from "@/context/ProfileContext";
import { VoiceNote, PitchResult } from "@/lib/storage";
import { generatePitchToThem, generatePitchFromThem } from "@/lib/ai";
import { GradeBar } from "@/components/GradeBar";
import { VoiceNotePlayer } from "@/components/VoiceNotePlayer";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { useColors } from "@/hooks/useColors";

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
  const { getCardById, addOrUpdateCard, removeCard } = useCards();
  const { profile } = useProfile();
  const card = getCardById(id);

  const [generatingPitch, setGeneratingPitch] = useState<"to-them" | "from-them" | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
        {/* Card Header */}
        <View style={[styles.cardHeader, { backgroundColor: colors.navy }]}>
          <View style={[styles.cardAvatar, { backgroundColor: colors.primary }]}>
            {card.imageFront ? (
              <Image source={{ uri: card.imageFront }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <Text style={[styles.cardName, { color: "#fff" }]}>{card.name}</Text>
          {card.title ? (
            <Text style={[styles.cardTitle, { color: colors.gold }]}>{card.title}</Text>
          ) : null}
          {card.company ? (
            <Text style={[styles.cardCompany, { color: "#94a3b8" }]}>{card.company}</Text>
          ) : null}
          {card.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "30" }]}>
              <Text style={[styles.categoryText, { color: "#dbeafe" }]}>{card.category}</Text>
            </View>
          ) : null}
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
