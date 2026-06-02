import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/lib/constants";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.gray[100], text: Colors.gray[700] },
  success: { bg: "#dcfce7", text: "#166534" },
  warning: { bg: "#fef9c3", text: "#854d0e" },
  error: { bg: "#fee2e2", text: "#991b1b" },
  info: { bg: "#dbeafe", text: "#1e40af" },
  outline: { bg: "transparent", text: Colors.gray[600] },
};

export default function Badge({ label, variant = "default" }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        variant === "outline" && styles.outline,
      ]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
