import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@/lib/constants";

interface ProgressBarProps {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
}

export default function ProgressBar({
  progress,
  color = Colors.primary[600],
  trackColor = Colors.gray[200],
  height = 6,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View
      style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 100,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    borderRadius: 100,
  },
});
