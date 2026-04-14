import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface GradeBarProps {
  grade: number;
  label: string;
}

export function GradeBar({ grade, label }: GradeBarProps) {
  const colors = useColors();

  const getColor = () => {
    if (grade >= 80) return colors.success;
    if (grade >= 60) return colors.warning;
    return colors.destructive;
  };

  const barColor = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <View style={[styles.badge, { backgroundColor: barColor }]}>
          <Text style={styles.gradeText}>{grade}%</Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${grade}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 14, fontWeight: "500" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  gradeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
});
