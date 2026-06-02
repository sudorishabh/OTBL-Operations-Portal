import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input as InputComponent } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Control,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from "react-hook-form";
import { Textarea } from "../ui/textarea";

interface SelectOption {
  label: string;
  value: string;
}

interface FormModeProps<TFieldValues extends FieldValues = FieldValues> {
  mode?: "form";
  control: Control<TFieldValues>;
  fieldName: FieldPath<TFieldValues>;
  rules?: RegisterOptions<TFieldValues>;
  value?: never;
  defaultValue?: never;
}

interface StandaloneModeProps {
  mode: "standalone";
  control?: never;
  fieldName?: never;
  rules?: never;
  value?: string;
  defaultValue?: string;
}

interface CommonProps {
  Label?: string;
  LabelIcon?: React.JSXElementConstructor<React.SVGProps<SVGSVGElement>>;
  placeholder?: string;
  optional?: boolean;
  type?: string;
  inputIconButton?: {
    icon: React.JSXElementConstructor<React.SVGProps<SVGSVGElement>>;
    onClick: () => void;
  };
  inputIcon?: React.JSXElementConstructor<React.SVGProps<SVGSVGElement>>;
  onChange?: (value: any) => void;
  disabled?: boolean;
  description?: string;
  formatDisplay?: (value: any) => string;
  parseValue?: (displayValue: string) => any;
  isSelect?: boolean;
  selectOptions?: SelectOption[];
  isTextArea?: boolean;
  isDate?: boolean;
  className?: string;
  isWhiteBg?: boolean;
}

type Props<TFieldValues extends FieldValues = FieldValues> = CommonProps &
  (FormModeProps<TFieldValues> | StandaloneModeProps);

const Input = <TFieldValues extends FieldValues = FieldValues>(
  props: Props<TFieldValues>,
) => {
  const standaloneDefault =
    props.mode === "standalone"
      ? (props as StandaloneModeProps).defaultValue ?? ""
      : "";
  const [internalValue, setInternalValue] = React.useState(standaloneDefault);

  const {
    Label,
    LabelIcon,
    placeholder,
    optional,
    type,
    inputIconButton,
    onChange,
    inputIcon,
    disabled,
    description,
    isSelect,
    selectOptions,
    isTextArea,
    isDate,
    formatDisplay,
    parseValue,
    className,
    isWhiteBg,
  } = props;
  const commonInputStyles = isWhiteBg ? "bg-white" : "bg-gray-100/50";

  const mode = props.mode ?? (props.control ? "form" : "standalone");

  const renderInputElement = (
    value: any,
    onChangeHandler: (val: any) => void,
  ) => {
    if (isSelect && selectOptions) {
      return (
        <Select
          key={`select-${value || "empty"}`}
          value={formatDisplay ? formatDisplay(value) : (value !== undefined && value !== null ? value.toString() : "")}
          onValueChange={(val) => {
            const valueToStore = parseValue ? parseValue(val) : val;
            onChangeHandler(valueToStore);
            onChange?.(val);
          }}
          disabled={disabled}>
          <SelectTrigger
            className={`w-full ${commonInputStyles} focus:ring-[3px] focus:ring-ring/50 ${className || ""} ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}>
            <SelectValue
              placeholder={placeholder ?? `Select ${Label?.toLowerCase()}`}
            />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (isTextArea) {
      return (
        <Textarea
          autoComplete='off'
          className={`${commonInputStyles} ${className || ""} ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          placeholder={placeholder ?? `Enter ${Label?.toLowerCase()}`}
          disabled={disabled}
          value={formatDisplay ? formatDisplay(value) : (value !== undefined && value !== null ? value : "")}
          onChange={(e) => {
            const display = e.target.value;
            const valueToStore = parseValue ? parseValue(display) : display;
            onChangeHandler(valueToStore);
            onChange?.(display);
          }}
        />
      );
    }

    if (isDate) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              disabled={disabled}
              className={`w-full justify-start text-left font-normal ${commonInputStyles} ${
                !value && "text-muted-foreground"
              } ${className || ""}`}>
              <CalendarIcon className='mr-2 h-4 w-4' />
              {value ? value : "Pick a date"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='p-0'
            align='start'>
            <div className='p-2'>
              <Calendar
                mode='single'
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => {
                  if (!date) {
                    onChangeHandler("");
                    onChange?.("");
                    return;
                  }
                  const formatted = format(date, "yyyy-MM-dd");
                  onChangeHandler(formatted);
                  onChange?.(formatted);
                }}
                disabled={disabled}
                initialFocus
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className='relative'>
        {inputIcon &&
          (() => {
            const IconComponent = inputIcon;
            return (
              <div className='absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none'>
                <IconComponent className='size-4' />
              </div>
            );
          })()}
        <InputComponent
          type={type ?? "text"}
          className={`${inputIcon ? "pl-10" : ""} ${commonInputStyles} ${
            inputIconButton ? "pr-10" : ""
          } ${className || ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          placeholder={placeholder ?? `Enter ${Label?.toLowerCase()}`}
          disabled={disabled}
          value={formatDisplay ? formatDisplay(value) : (value !== undefined && value !== null ? value : "")}
          onChange={(e) => {
            const display = e.target.value;
            const valueToStore = parseValue ? parseValue(display) : display;
            onChangeHandler(valueToStore);
            onChange?.(valueToStore);
          }}
        />
        {inputIconButton && (
          <button
            type='button'
            onClick={inputIconButton.onClick}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-500'>
            <inputIconButton.icon className='size-4' />
          </button>
        )}
      </div>
    );
  };

  const renderWrapper = (children: React.ReactNode, showError?: boolean) => (
    <div className='space-y-1'>
      {Label && (
        <label className='text-xs font-medium text-neutral-700 flex items-center gap-2'>
          {LabelIcon && <LabelIcon className='size-3.5 text-neutral-400' />}
          <span>{Label}</span>
          {optional && (
            <span className='text-xs font-normal text-neutral-400'>
              (Optional)
            </span>
          )}
        </label>
      )}
      {children}
      {description && <p className='text-xs text-neutral-500'>{description}</p>}
    </div>
  );

  if (mode === "standalone") {
    const standaloneProps = props as StandaloneModeProps & CommonProps;
    const currentValue = standaloneProps.value ?? internalValue;

    return renderWrapper(
      renderInputElement(currentValue, (val) => {
        setInternalValue(val);
      }),
    );
  }

  const formProps = props as FormModeProps<TFieldValues> & CommonProps;

  return (
    <FormField
      control={formProps.control}
      name={formProps.fieldName}
      rules={formProps.rules}
      render={({ field }) => (
        <FormItem className='space-y-1'>
          <FormLabel className='text-xs font-medium text-neutral-700 flex items-center gap-2'>
            {LabelIcon && <LabelIcon className='size-3.5 text-neutral-400' />}
            <span>{Label}</span>
            {optional && (
              <span className='text-xs font-normal text-neutral-400'>
                (Optional)
              </span>
            )}
          </FormLabel>
          <FormControl>
            {renderInputElement(field.value, field.onChange)}
          </FormControl>
          {description && (
            <p className='text-xs text-neutral-500'>{description}</p>
          )}
          <FormMessage className='text-xs' />
        </FormItem>
      )}
    />
  );
};

export default Input;
