import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Colors } from "@/lib/constants";

interface FormTextAreaProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  numberOfLines?: number;
}

export default function FormTextArea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  numberOfLines = 4,
}: FormTextAreaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <View style={styles.container}>
          {label && <Text style={styles.label}>{label}</Text>}
          <TextInput
            style={[
              styles.input,
              { height: numberOfLines * 22 + 24 },
              error && styles.inputError,
            ]}
            value={value?.toString() || ""}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={Colors.gray[400]}
            multiline
            numberOfLines={numberOfLines}
            textAlignVertical='top'
          />
          {error && <Text style={styles.errorText}>{error.message}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gray[700],
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: Colors.gray[900],
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
});
