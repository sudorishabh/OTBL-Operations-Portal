"use client";
import React from "react";
import {
  ArrowUpDown,
  CalendarRange,
  Landmark,
  Layers,
  MapPinned,
  ReceiptText,
} from "lucide-react";
import {
  ALL,
  ComboboxFilter,
  SelectFilter,
  type FilterOption,
} from "@/components/filters/list-filters";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import {
  EXPENSE_SOURCES,
  SITE_PROCESSES,
  WORK_ORDER_PROCESSES,
  type ExpenseSource,
} from "./labels";

// The filters the overview's dialogs narrow their sections by. Each takes
// its value as the API does, undefined for "any", and hands it back so.

type OfficeOption = RouterOutputs["officeQuery"]["getOfficeOptions"][number];

// A choice that may be "any": ALL in the select, undefined in the filters.
const toSelect = (value: string | number | undefined) =>
  value === undefined ? ALL : String(value);
const fromSelect = <T extends string>(value: string) =>
  value === ALL ? undefined : (value as T);

// Every office the user can see, picked by searching.
export const OfficeFilter = ({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (officeId: number | undefined) => void;
}) => {
  const query = trpc.officeQuery.getOfficeOptions.useQuery();
  const offices: OfficeOption[] = query.data ?? [];

  return (
    <ComboboxFilter
      label='Office'
      allLabel='All offices'
      Icon={Landmark}
      value={toSelect(value)}
      onChange={(next) => onChange(next === ALL ? undefined : Number(next))}
      options={offices.map((office) => ({
        value: String(office.id),
        label: office.name,
        hint: [office.city, office.state].filter(Boolean).join(", "),
      }))}
      isLoading={query.isLoading}
      searchPlaceholder='Search offices, cities...'
    />
  );
};

// The states the user's offices are in.
export const StateFilter = ({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (state: string | undefined) => void;
}) => {
  const query = trpc.officeQuery.getOfficeOptions.useQuery();
  const offices: OfficeOption[] = query.data ?? [];
  const states = [...new Set(offices.map((office) => office.state))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return (
    <ComboboxFilter
      label='State'
      allLabel='All states'
      Icon={MapPinned}
      value={value ?? ALL}
      onChange={(next) => onChange(fromSelect(next))}
      options={states.map((state) => ({ value: state, label: state }))}
      isLoading={query.isLoading}
      searchPlaceholder='Search states...'
    />
  );
};

export type WorkOrderProcess = (typeof WORK_ORDER_PROCESSES)[number]["value"];

// A work order's process.
export const WorkOrderProcessFilter = ({
  value,
  onChange,
}: {
  value: WorkOrderProcess | undefined;
  onChange: (process: WorkOrderProcess | undefined) => void;
}) => (
  <SelectFilter
    label='Process'
    Icon={Layers}
    value={toSelect(value)}
    onChange={(next) => onChange(fromSelect<WorkOrderProcess>(next))}
    options={[{ value: ALL, label: "All processes" }, ...WORK_ORDER_PROCESSES]}
  />
);

export type SiteProcess = (typeof SITE_PROCESSES)[number]["value"];

// The process of the site an expense was spent at.
export const SiteProcessFilter = ({
  value,
  onChange,
}: {
  value: SiteProcess | undefined;
  onChange: (process: SiteProcess | undefined) => void;
}) => (
  <SelectFilter
    label='Process'
    Icon={Layers}
    value={toSelect(value)}
    onChange={(next) => onChange(fromSelect<SiteProcess>(next))}
    options={[{ value: ALL, label: "All processes" }, ...SITE_PROCESSES]}
  />
);

// What an expense was spent through.
export const SourceFilter = ({
  value,
  onChange,
}: {
  value: ExpenseSource | undefined;
  onChange: (source: ExpenseSource | undefined) => void;
}) => (
  <SelectFilter
    label='Spent through'
    Icon={ReceiptText}
    value={toSelect(value)}
    onChange={(next) => onChange(fromSelect<ExpenseSource>(next))}
    options={[
      { value: ALL, label: "Spent through anything" },
      ...EXPENSE_SOURCES,
    ]}
  />
);

// The financial year work orders start in, of those the user's span.
export const FinancialYearFilter = ({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (year: string | undefined) => void;
}) => {
  const query = trpc.dashboardQuery.getFilterOptions.useQuery();
  const years: string[] = query.data?.financialYears ?? [];

  return (
    <SelectFilter
      label='Financial year'
      Icon={CalendarRange}
      value={toSelect(value)}
      onChange={(next) => onChange(fromSelect(next))}
      options={[
        { value: ALL, label: "All financial years" },
        ...years.map((year) => ({ value: year, label: `FY ${year}` })),
      ]}
    />
  );
};

// A short list of fixed choices that always has one picked, such as a sort
// order or how many months to show.
export const ChoiceFilter = <T extends string | number>({
  label,
  value,
  onChange,
  options,
  icon = "sort",
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  icon?: "sort" | "range";
}) => (
  <SelectFilter
    label={label}
    Icon={icon === "sort" ? ArrowUpDown : CalendarRange}
    value={String(value)}
    onChange={(next) =>
      onChange(options.find((option) => String(option.value) === next)!.value)
    }
    options={options.map(
      (option): FilterOption => ({
        value: String(option.value),
        label: option.label,
      }),
    )}
    defaultValue={null}
  />
);
