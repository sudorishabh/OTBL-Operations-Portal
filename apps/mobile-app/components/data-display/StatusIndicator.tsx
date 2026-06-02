import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@/lib/constants";
import Badge from "@/components/ui/Badge";

interface StatusIndicatorProps {
  status: string;
  style?: ViewStyle;
}

export default function StatusIndicator({
  status,
  style,
}: StatusIndicatorProps) {
  const normalized = status?.toLowerCase() || "unknown";

  const variant =
    normalized === "active" || normalized === "completed"
      ? "success"
      : normalized === "inactive" || normalized === "cancelled"
        ? "error"
        : normalized === "pending"
          ? "warning"
          : "default";

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dot, { backgroundColor: dotColors[variant] }]} />
      <Badge
        label={status}
        variant={variant}
      />
    </View>
  );
}

const dotColors: Record<string, string> = {
  success: Colors.success,
  error: Colors.error,
  warning: Colors.warning,
  default: Colors.gray[400],
  info: Colors.info,
  outline: Colors.gray[400],
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
