import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Inbox } from "lucide-react-native";
import { Colors } from "@/lib/constants";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = "No data found",
  subtitle = "There's nothing to show here yet.",
  icon,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon || (
        <Inbox
          size={48}
          color={Colors.gray[300]}
        />
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.gray[700],
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[400],
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
});
