import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { Colors } from "@/lib/constants";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  error?: string;
}

export default function Select({
  label,
  placeholder = "Select an option",
  options,
  value,
  onValueChange,
  error,
}: SelectProps) {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}>
        <Text
          style={[styles.triggerText, !selectedOption && styles.placeholder]}>
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronDown
          size={18}
          color={Colors.gray[400]}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={visible}
        transparent
        animationType='slide'
        onRequestClose={() => setVisible(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}>
          <Pressable
            style={styles.modal}
            onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{label || "Select"}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setVisible(false);
                  }}>
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Check
                      size={18}
                      color={Colors.primary[600]}
                    />
                  )}
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
  trigger: {
    height: 48,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerError: {
    borderColor: Colors.error,
  },
  triggerText: {
    fontSize: 15,
    color: Colors.gray[900],
    flex: 1,
  },
  placeholder: {
    color: Colors.gray[400],
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: "60%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray[300],
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.gray[900],
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  optionSelected: {
    backgroundColor: Colors.primary[50],
  },
  optionText: {
    fontSize: 15,
    color: Colors.gray[700],
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.primary[600],
    fontWeight: "600",
  },
});
