import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@/lib/constants";

interface TitleDescRowProps {
  icon?: React.ReactNode;
  title: string;
  value: string | number | null | undefined;
  style?: ViewStyle;
}

export default function TitleDescRow({
  icon,
  title,
  value,
  style,
}: TitleDescRowProps) {
  return (
    <View style={[styles.row, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value ?? "N/A"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    color: Colors.gray[500],
    fontWeight: "500",
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: Colors.gray[900],
    fontWeight: "500",
  },
});
