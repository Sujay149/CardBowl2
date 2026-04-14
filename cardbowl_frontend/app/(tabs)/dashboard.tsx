import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCards } from "@/context/CardsContext";
import { MetricCard } from "@/components/MetricCard";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cards } = useCards();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const stats = useMemo(() => {
    const totalCards = cards.length;
    const withPitch = cards.filter(
      (c) => c.pitchToThem || c.pitchFromThem
    ).length;
    const withVoice = cards.filter((c) => c.voiceNotes.length > 0).length;
    const totalVoiceNotes = cards.reduce(
      (sum, c) => sum + c.voiceNotes.length,
      0
    );

    const categoryCounts: Record<string, number> = {};
    cards.forEach((c) => {
      const cat = c.category || "Unknown";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const topCategory =
      Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "—";

    const avgGrade =
      cards.filter((c) => c.pitchToThem).length > 0
        ? Math.round(
            cards
              .filter((c) => c.pitchToThem)
              .reduce((s, c) => s + (c.pitchToThem?.grade || 0), 0) /
              cards.filter((c) => c.pitchToThem).length
          )
        : 0;

    const thisWeek = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return cards.filter((c) => new Date(c.createdAt) > d).length;
    })();

    const allKeywords: string[] = [];
    cards.forEach((c) => allKeywords.push(...(c.keywords || [])));
    const kwCounts: Record<string, number> = {};
    allKeywords.forEach((k) => {
      kwCounts[k] = (kwCounts[k] || 0) + 1;
    });
    const topKeywords = Object.entries(kwCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => k);

    return {
      totalCards,
      withPitch,
      withVoice,
      totalVoiceNotes,
      topCategory,
      avgGrade,
      thisWeek,
      topKeywords,
      categoryCounts,
    };
  }, [cards]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Dashboard
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your network at a glance
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          label="Total Cards"
          value={stats.totalCards}
          icon="credit-card"
          color={colors.primary}
        />
        <MetricCard
          label="This Week"
          value={stats.thisWeek}
          icon="trending-up"
          color={colors.success}
        />
      </View>
      <View style={styles.metricsGrid}>
        <MetricCard
          label="With Pitches"
          value={stats.withPitch}
          icon="zap"
          color={colors.gold}
        />
        <MetricCard
          label="Voice Notes"
          value={stats.totalVoiceNotes}
          icon="mic"
          color={colors.warning}
        />
      </View>

      {stats.avgGrade > 0 && (
        <View
          style={[
            styles.avgGradeCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.avgGradeLeft}>
            <Text style={[styles.avgGradeTitle, { color: colors.mutedForeground }]}>
              Avg Pitch Score
            </Text>
            <Text style={[styles.avgGradeValue, { color: colors.primary }]}>
              {stats.avgGrade}%
            </Text>
          </View>
          <View style={[styles.avgGradeBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.avgGradeFill,
                {
                  width: `${stats.avgGrade}%` as any,
                  backgroundColor:
                    stats.avgGrade >= 80
                      ? colors.success
                      : stats.avgGrade >= 60
                      ? colors.warning
                      : colors.destructive,
                },
              ]}
            />
          </View>
        </View>
      )}

      {Object.keys(stats.categoryCounts).length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Industry Breakdown
          </Text>
          {Object.entries(stats.categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => (
              <View key={cat} style={styles.catRow}>
                <Text
                  style={[styles.catName, { color: colors.foreground }]}
                >
                  {cat}
                </Text>
                <View style={styles.catBarWrap}>
                  <View
                    style={[styles.catBar, { backgroundColor: colors.border }]}
                  >
                    <View
                      style={[
                        styles.catFill,
                        {
                          width: `${(count / stats.totalCards) * 100}%` as any,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catCount, { color: colors.mutedForeground }]}>
                    {count}
                  </Text>
                </View>
              </View>
            ))}
        </View>
      )}

      {stats.topKeywords.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Top Keywords
          </Text>
          <View style={styles.kwWrap}>
            {stats.topKeywords.map((kw) => (
              <View
                key={kw}
                style={[styles.kwChip, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.kwText, { color: colors.primary }]}>
                  {kw}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {stats.totalCards === 0 && (
        <View style={styles.emptyState}>
          <Feather name="bar-chart-2" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No data yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Scan business cards to see your network metrics
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 12, paddingHorizontal: 16 },
  header: { paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14 },
  metricsGrid: { flexDirection: "row", gap: 10 },
  avgGradeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  avgGradeLeft: { flexDirection: "row", justifyContent: "space-between" },
  avgGradeTitle: { fontSize: 14 },
  avgGradeValue: { fontSize: 22, fontWeight: "800" },
  avgGradeBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  avgGradeFill: { height: "100%", borderRadius: 4 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  catRow: { gap: 4 },
  catName: { fontSize: 13, fontWeight: "500" },
  catBarWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  catBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  catFill: { height: "100%", borderRadius: 3 },
  catCount: { fontSize: 12, minWidth: 20, textAlign: "right" },
  kwWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kwChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  kwText: { fontSize: 12, fontWeight: "500" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
});
