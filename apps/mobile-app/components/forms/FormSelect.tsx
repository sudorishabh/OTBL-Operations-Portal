import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import Select, { SelectOption } from "@/components/ui/Select";

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
}

export default function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
}: FormSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <Select
          label={label}
          placeholder={placeholder}
          options={options}
          value={value}
          onValueChange={onChange}
          error={error?.message}
        />
      )}
    />
  );
}
