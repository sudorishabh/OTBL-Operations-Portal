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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isValid } from "date-fns";
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

// The years a date field's dropdowns offer, from 2000 to ten years ahead.
const FIRST_MONTH = new Date(2000, 0, 1);
const LAST_MONTH = new Date(new Date().getFullYear() + 10, 11, 31);

// A date picked from a calendar and stored as yyyy-MM-dd. It closes once a day
// is picked, and its month and year dropdowns reach far dates in a tap or two.
const DateInput = ({
  value,
  onPick,
  disabled,
  className,
}: {
  // Forms may load a saved date as a Date, not a string.
  value: Date | string | undefined | null;
  onPick: (formatted: string) => void;
  disabled?: boolean;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value) : undefined;
  const picked = date && isValid(date) ? date : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          disabled={disabled}
          className={`w-full justify-start text-left font-normal ${
            !picked && "text-muted-foreground"
          } ${className || ""}`}>
          <CalendarIcon className='mr-2 h-4 w-4' />
          {picked ? format(picked, "yyyy-MM-dd") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-auto p-0'
        align='start'>
        <Calendar
          mode='single'
          selected={picked}
          defaultMonth={picked}
          captionLayout='dropdown'
          startMonth={FIRST_MONTH}
          endMonth={LAST_MONTH}
          onSelect={(day) => {
            // Tapping the picked day again keeps it rather than clearing it.
            if (day) onPick(format(day, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

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
        <DateInput
          value={value}
          disabled={disabled}
          className={`${commonInputStyles} ${className || ""}`}
          onPick={(formatted) => {
            onChangeHandler(formatted);
            onChange?.(formatted);
          }}
        />
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
