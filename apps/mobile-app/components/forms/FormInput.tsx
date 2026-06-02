import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import Input from "@/components/ui/Input";
import { TextInputProps } from "react-native";

interface FormInputProps<T extends FieldValues>
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
}

export default function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  secureTextEntry,
  ...rest
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <Input
          label={label}
          placeholder={placeholder}
          value={value?.toString() || ""}
          onChangeText={onChange}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          error={error?.message}
          {...rest}
        />
      )}
    />
  );
}
