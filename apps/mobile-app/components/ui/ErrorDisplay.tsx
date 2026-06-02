import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { Colors } from "@/lib/constants";
import Button from "./Button";

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({
  title = "Something went wrong",
  message = "An error occurred. Please try again.",
  onRetry,
}: ErrorDisplayProps) {
  return (
    <View style={styles.container}>
      <AlertTriangle
        size={48}
        color={Colors.error}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title='Try Again'
          variant='outline'
          onPress={onRetry}
          style={styles.button}
        />
      )}
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
    color: Colors.gray[800],
    marginTop: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
  },
});
