import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}

export function MetricCard({ label, value, icon, color }: MetricCardProps) {
  const colors = useColors();
  const accentColor = color || colors.primary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accentColor + "20" }]}>
        <Feather name={icon as any} size={20} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 24, fontWeight: "800" },
  label: { fontSize: 11, textAlign: "center" },
});
