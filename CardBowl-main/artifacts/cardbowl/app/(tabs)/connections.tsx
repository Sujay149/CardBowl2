import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCards } from "@/context/CardsContext";
import { BusinessCard } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";

interface ConnectionGroup {
  label: string;
  type: "company" | "industry" | "keyword";
  cards: BusinessCard[];
  sharedValue: string;
}

function ConnectionGroupCard({
  group,
  onPress,
}: {
  group: ConnectionGroup;
  onPress: (id: string) => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const iconMap = { company: "home", industry: "grid", keyword: "tag" } as const;
  const colorMap = {
    company: colors.primary,
    industry: colors.warning,
    keyword: colors.success,
  };
  const labelMap = {
    company: "Same Company",
    industry: "Same Industry",
    keyword: "Shared Interest",
  };

  const accent = colorMap[group.type];

  return (
    <View
      style={[
        styles.groupCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={[styles.groupIcon, { backgroundColor: accent + "20" }]}>
          <Feather name={iconMap[group.type]} size={16} color={accent} />
        </View>
        <View style={styles.groupInfo}>
          <Text
            style={[styles.groupLabel, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {group.sharedValue}
          </Text>
          <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
            {labelMap[group.type]} · {group.cards.length} contact
            {group.cards.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.membersList}>
          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />
          {group.cards.map((card) => {
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
                key={card.id}
                style={styles.memberRow}
                onPress={() => onPress(card.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    { backgroundColor: accent + "20" },
                  ]}
                >
                  <Text style={[styles.memberInitials, { color: accent }]}>
                    {initials}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text
                    style={[styles.memberName, { color: colors.foreground }]}
                  >
                    {card.name || "Unknown"}
                  </Text>
                  <Text
                    style={[
                      styles.memberTitle,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {card.title
                      ? `${card.title}${card.company ? " · " + card.company : ""}`
                      : card.company || ""}
                  </Text>
                </View>
                <Feather
                  name="arrow-right"
                  size={14}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function ConnectionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cards } = useCards();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [filter, setFilter] = useState<"all" | "company" | "industry" | "keyword">("all");

  const groups = useMemo(() => {
    const result: ConnectionGroup[] = [];

    // Group by company (2+ contacts)
    const companyMap: Record<string, BusinessCard[]> = {};
    cards.forEach((c) => {
      if (c.company) {
        const key = c.company.trim().toLowerCase();
        companyMap[key] = companyMap[key] || [];
        companyMap[key].push(c);
      }
    });
    Object.entries(companyMap).forEach(([key, members]) => {
      if (members.length >= 2) {
        result.push({
          label: members[0].company,
          type: "company",
          cards: members,
          sharedValue: members[0].company,
        });
      }
    });

    // Group by industry/category (2+ contacts)
    const industryMap: Record<string, BusinessCard[]> = {};
    cards.forEach((c) => {
      if (c.category) {
        const key = c.category.trim().toLowerCase();
        industryMap[key] = industryMap[key] || [];
        industryMap[key].push(c);
      }
    });
    Object.entries(industryMap).forEach(([, members]) => {
      if (members.length >= 2) {
        result.push({
          label: members[0].category!,
          type: "industry",
          cards: members,
          sharedValue: members[0].category!,
        });
      }
    });

    // Group by shared keyword (2+ contacts, top keywords only)
    const kwMap: Record<string, BusinessCard[]> = {};
    cards.forEach((c) => {
      (c.keywords || []).forEach((kw) => {
        const key = kw.trim().toLowerCase();
        kwMap[key] = kwMap[key] || [];
        if (!kwMap[key].find((x) => x.id === c.id)) kwMap[key].push(c);
      });
    });
    Object.entries(kwMap)
      .filter(([, members]) => members.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .forEach(([kw, members]) => {
        result.push({
          label: kw,
          type: "keyword",
          cards: members,
          sharedValue: kw.charAt(0).toUpperCase() + kw.slice(1),
        });
      });

    return result.sort((a, b) => b.cards.length - a.cards.length);
  }, [cards]);

  const filtered = useMemo(
    () => (filter === "all" ? groups : groups.filter((g) => g.type === filter)),
    [groups, filter]
  );

  const totalMutuals = useMemo(() => {
    const seen = new Set<string>();
    groups.forEach((g) => g.cards.forEach((c) => seen.add(c.id)));
    return seen.size;
  }, [groups]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Connections
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {totalMutuals} contact{totalMutuals !== 1 ? "s" : ""} in{" "}
          {groups.length} cluster{groups.length !== 1 ? "s" : ""}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              { key: "all", label: "All" },
              { key: "company", label: "Company" },
              { key: "industry", label: "Industry" },
              { key: "keyword", label: "Keyword" },
            ] as const
          ).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filter === f.key ? colors.primary : colors.muted,
                  borderColor:
                    filter === f.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      filter === f.key ? "#fff" : colors.mutedForeground,
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === "web" ? 34 : insets.bottom + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {cards.length < 2
                ? "Add more cards to see connections"
                : "No clusters found"}
            </Text>
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              Connections appear when 2+ contacts share a company, industry, or
              keyword
            </Text>
          </View>
        ) : (
          filtered.map((group, i) => (
            <ConnectionGroupCard
              key={`${group.type}-${group.sharedValue}-${i}`}
              group={group}
              onPress={(id) => router.push(`/card/${id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 13, marginBottom: 8 },
  filterScroll: { marginTop: 6 },
  filterRow: { gap: 8, paddingRight: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "500" },
  content: { padding: 16, gap: 10 },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  groupInfo: { flex: 1 },
  groupLabel: { fontSize: 15, fontWeight: "600" },
  groupMeta: { fontSize: 12 },
  divider: { height: 1, marginHorizontal: 14 },
  membersList: { paddingBottom: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInitials: { fontSize: 14, fontWeight: "700" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600" },
  memberTitle: { fontSize: 12 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
