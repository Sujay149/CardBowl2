import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BusinessCard } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";

interface CardItemProps {
  card: BusinessCard;
  onPress: () => void;
}

export function CardItem({ card, onPress }: CardItemProps) {
  const colors = useColors();

  const initials = card.name
    ? card.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
        {card.imageFront ? (
          <Image source={{ uri: card.imageFront }} style={styles.avatarImg} />
        ) : (
          <Text style={[styles.initials, { color: colors.primary }]}>
            {initials}
          </Text>
        )}
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {card.name || "Unknown"}
        </Text>
        {card.title ? (
          <Text
            style={[styles.title, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {card.title}
          </Text>
        ) : null}
        {card.company ? (
          <Text
            style={[styles.company, { color: colors.primary }]}
            numberOfLines={1}
          >
            {card.company}
          </Text>
        ) : null}
        {card.location?.address ? (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={10} color={colors.success} />
            <Text
              style={[styles.locationText, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {card.location.address}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        {card.voiceNotes.length > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.goldLight }]}>
            <Feather name="mic" size={10} color={colors.gold} />
            <Text style={[styles.badgeText, { color: colors.gold }]}>
              {card.voiceNotes.length}
            </Text>
          </View>
        )}
        {(card.pitchToThem || card.pitchFromThem) && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Feather name="zap" size={10} color={colors.primary} />
          </View>
        )}
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  initials: { fontSize: 18, fontWeight: "700" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "600" },
  title: { fontSize: 12 },
  company: { fontSize: 13, fontWeight: "500" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  locationText: { fontSize: 11 },
  meta: { alignItems: "center", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
});
