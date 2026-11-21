"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  useController,
  useFieldArray,
  useFormContext,
  type FieldPath,
} from "react-hook-form";
import CustomButton from "@/components/shared/btn";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { workOrderTypes } from "@pkg/schema";
import { constants } from "@pkg/utils";

const {
  WO_ACTIVITIES,
  GST_PERCENTAGE,
  WO_PROCESS,
  TRANSPORT_SLABS,
  allActivityOptions,
} = constants;

type FormValues = workOrderTypes.BaseWorkOrderInput;
type ActivityOption = (typeof allActivityOptions)[number];

// Columns: Included | Activity | Unit | Est. Qty | RC Rate | Rate + GST | Total
const ROW_GRID =
  "grid grid-cols-[1rem_minmax(12rem,1fr)_4.5rem_8rem_8.5rem_7.5rem_8.5rem] items-center gap-x-3 px-4";

const formatAmount = (value: number) =>
  value.toLocaleString("en-IN", { style: "currency", currency: "INR" });

const formatQuantity = (value: number) =>
  value.toLocaleString("en-IN", { maximumFractionDigits: 2 });

// A computed value shown in place of an input.
const derivedValueClass =
  "pr-3 text-right text-sm font-semibold tabular-nums text-gray-900";

const isTransportation = (activity: string) =>
  activity === WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL;

// The activities a work order of this process type can be billed for.
const activitiesForProcess = (processType?: string) => {
  if (processType === WO_PROCESS.BIOREMEDIATION) {
    return allActivityOptions.filter((option) => option.isBioremediation);
  }
  if (processType === WO_PROCESS.RESTORATION) {
    return allActivityOptions.filter((option) => !option.isBioremediation);
  }
  return allActivityOptions;
};

// Bioremediation's one activity is what its sites treat soil under, so a
// process that treats soil always has it. The rest are picked as needed.
const isRequired = (option: ActivityOption, processType?: string) =>
  option.isBioremediation && processType !== WO_PROCESS.RESTORATION;

const emptySlab = { quantity: 0, rate: 0 };

const emptyRow = (
  option: ActivityOption,
): workOrderTypes.ScheduleOfRateInput => ({
  activity: { name: option.value, unit: option.unit },
  unit: option.unit,
  estimated_quantity: 0,
  rc_unit_rate: 0,
  gst_percentage: GST_PERCENTAGE,
  unit_rate_inc_gst: 0,
  total_cost: 0,
  ...(isTransportation(option.value) && {
    transportation_slabs: {
      up_to_5_km: { ...emptySlab },
      over_20_km: { ...emptySlab },
      over_40_km: { ...emptySlab },
    },
  }),
});

const isIncomplete = (row: workOrderTypes.ScheduleOfRateInput) =>
  !(Number(row.estimated_quantity) > 0) || !(Number(row.rc_unit_rate) > 0);

interface NumberFieldProps {
  name: FieldPath<FormValues>;
  label: string;
  prefix?: string;
  onValueChange: () => void;
  // Smaller field for the transportation slab rows.
  compact?: boolean;
}

// A numeric field that starts blank rather than showing 0.
const NumberField = ({
  name,
  label,
  prefix,
  onValueChange,
  compact,
}: NumberFieldProps) => {
  const { control } = useFormContext<FormValues>();
  const { field } = useController({ control, name });
  const [text, setText] = useState(() =>
    Number(field.value) ? String(field.value) : "",
  );

  return (
    <div className='relative'>
      {prefix && (
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400",
            compact ? "left-2.5 text-xs" : "left-3 text-sm",
          )}>
          {prefix}
        </span>
      )}
      <Input
        ref={field.ref}
        name={field.name}
        type='number'
        inputMode='decimal'
        min={0}
        step='any'
        placeholder='0'
        aria-label={label}
        value={text}
        onBlur={field.onBlur}
        onChange={(e) => {
          setText(e.target.value);
          field.onChange(e.target.value === "" ? 0 : Number(e.target.value));
          onValueChange();
        }}
        className={cn(
          "bg-white text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          compact ? "h-8 text-xs shadow-none md:text-xs" : "h-9",
          prefix && (compact ? "pl-6" : "pl-7"),
        )}
      />
    </div>
  );
};

interface Step2ScheduleOfRatesProps {
  onBack: () => void;
  isLoading: boolean;
}

const Step2ScheduleOfRates: React.FC<Step2ScheduleOfRatesProps> = ({
  onBack,
  isLoading,
}) => {
  const form = useFormContext<FormValues>();
  // Only the activities picked for the work order, in the process's order.
  const { fields, insert, remove, replace } = useFieldArray({
    control: form.control,
    name: "schedule_of_rates",
  });

  const processType = form.watch("process_type");
  const options = activitiesForProcess(processType);
  // `form` is a new object every render, so depend on its stable getValues.
  const { getValues } = form;
  // What was entered for an activity taken out, should it be put back.
  const setAside = useRef(
    new Map<string, workOrderTypes.ScheduleOfRateInput>(),
  );

  // Keep the picked activities the process type allows, with the ones it
  // needs, and anything already entered if the user comes back to this step.
  useEffect(() => {
    const current = getValues("schedule_of_rates") ?? [];
    const next = activitiesForProcess(processType).flatMap((option) => {
      const row = current.find((entry) => entry.activity.name === option.value);
      if (row) return [row];
      return isRequired(option, processType) ? [emptyRow(option)] : [];
    });
    const isInSync =
      next.length === current.length &&
      next.every((row, i) => row === current[i]);
    if (!isInSync) replace(next);
  }, [getValues, processType, replace]);

  const position = (name: string) =>
    options.findIndex((option) => option.value === name);

  // Adds an activity in its place in the list, or takes it out.
  const setIncluded = (option: ActivityOption, include: boolean) => {
    const rows = getValues("schedule_of_rates") ?? [];
    const index = rows.findIndex((row) => row.activity.name === option.value);
    if (include && index === -1) {
      const at = rows.filter(
        (row) => position(row.activity.name) < position(option.value),
      ).length;
      insert(at, setAside.current.get(option.value) ?? emptyRow(option));
    } else if (!include && index !== -1) {
      setAside.current.set(option.value, rows[index]!);
      remove(index);
    }
  };

  // Picks every activity, or only the ones the process needs.
  const setAllIncluded = (include: boolean) => {
    const rows = getValues("schedule_of_rates") ?? [];
    for (const row of rows) setAside.current.set(row.activity.name, row);
    replace(
      options.flatMap((option) =>
        include || isRequired(option, processType)
          ? [
              rows.find((row) => row.activity.name === option.value) ??
                setAside.current.get(option.value) ??
                emptyRow(option),
            ]
          : [],
      ),
    );
  };

  const calculateRates = (index: number) => {
    const values = form.getValues(`schedule_of_rates.${index}`);
    const rcRate = values.rc_unit_rate || 0;
    const quantity = values.estimated_quantity || 0;

    const unitRateInclusiveGst = Number(rcRate) * (1 + GST_PERCENTAGE / 100);
    const totalCost = Number(unitRateInclusiveGst) * Number(quantity);

    form.setValue(
      `schedule_of_rates.${index}.unit_rate_inc_gst`,
      Number(unitRateInclusiveGst.toFixed(2)),
    );
    form.setValue(
      `schedule_of_rates.${index}.total_cost`,
      Number(totalCost.toFixed(2)),
    );
  };

  // Transportation's quantity and RC rate are the totals of its distance slabs.
  const sumTransportSlabs = (index: number) => {
    const slabs = form.getValues(
      `schedule_of_rates.${index}.transportation_slabs`,
    );
    const slabList = slabs ? Object.values(slabs) : [];
    const total = (key: "quantity" | "rate") =>
      Number(
        slabList
          .reduce((sum, slab) => sum + (Number(slab[key]) || 0), 0)
          .toFixed(2),
      );

    form.setValue(
      `schedule_of_rates.${index}.estimated_quantity`,
      total("quantity"),
    );
    form.setValue(`schedule_of_rates.${index}.rc_unit_rate`, total("rate"));
    calculateRates(index);
  };

  const scheduleOfRates = form.watch("schedule_of_rates") ?? [];
  const grandTotal = scheduleOfRates.reduce(
    (sum, row) => sum + (Number(row.total_cost) || 0),
    0,
  );
  const missingCount = scheduleOfRates.filter(isIncomplete).length;
  const optional = options.filter((option) => !isRequired(option, processType));
  const pickedOptional = optional.filter((option) =>
    fields.some((field) => field.activity.name === option.value),
  ).length;
  // Land restoration needs at least one of its activities.
  const needsRestoration =
    processType !== WO_PROCESS.BIOREMEDIATION &&
    !fields.some((field) =>
      allActivityOptions.some(
        (option) =>
          option.value === field.activity.name && !option.isBioremediation,
      ),
    );

  return (
    <div className='flex-1 flex flex-col justify-between h-full'>
      <div className='space-y-4'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900'>
            Schedule of Rates
          </h3>
          <p className='text-sm text-gray-500'>
            Tick the activities this work order needs, then enter each
            one&apos;s quantity and RC rate. GST is fixed at 18%, so Rate + GST
            and Total are calculated for you.
          </p>
        </div>

        <div className='overflow-x-auto rounded-lg border border-gray-200'>
          <div className='min-w-[56rem]'>
            <div
              className={cn(
                ROW_GRID,
                "border-b border-gray-200 bg-gray-50 py-2.5 text-xs font-medium text-gray-500",
              )}>
              {/* Ticks or clears every activity the process doesn't need. */}
              <Checkbox
                aria-label='Include every activity'
                disabled={optional.length === 0}
                checked={
                  pickedOptional === 0
                    ? false
                    : pickedOptional === optional.length
                      ? true
                      : "indeterminate"
                }
                onCheckedChange={(checked) => setAllIncluded(checked === true)}
                className='border-gray-300 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=indeterminate]:border-emerald-600 data-[state=indeterminate]:bg-emerald-600 data-[state=indeterminate]:text-white'
              />
              <span>Activity</span>
              <span>Unit</span>
              <span className='text-right'>Est. Qty</span>
              <span className='text-right'>RC Rate</span>
              <span className='text-right'>Rate + GST</span>
              <span className='text-right'>Total</span>
            </div>

            <div className='divide-y divide-gray-100'>
              {options.map((option) => {
                const index = fields.findIndex(
                  (field) => field.activity.name === option.value,
                );
                const field = fields[index];
                const label = option.label;
                const required = isRequired(option, processType);
                const checkboxId = `sor-include-${option.value}`;

                if (!field) {
                  return (
                    <div
                      key={option.value}
                      className={cn(ROW_GRID, "bg-gray-50/50 py-3")}>
                      <Checkbox
                        id={checkboxId}
                        checked={false}
                        onCheckedChange={() => setIncluded(option, true)}
                        className='border-gray-300'
                      />
                      <label
                        htmlFor={checkboxId}
                        className='cursor-pointer text-sm text-gray-500'>
                        {label}
                      </label>
                      <span className='justify-self-start rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400'>
                        {option.unit}
                      </span>
                      <span className='col-span-4 pl-1 text-xs text-gray-400'>
                        Not in this work order
                      </span>
                    </div>
                  );
                }

                const hasSlabs = isTransportation(field.activity.name);
                const row = scheduleOfRates[index];
                const quantity = Number(row?.estimated_quantity) || 0;
                const rcRate = Number(row?.rc_unit_rate) || 0;
                const rateWithGst = Number(row?.unit_rate_inc_gst) || 0;
                const total = Number(row?.total_cost) || 0;

                return (
                  <div key={field.id}>
                    <div className={cn(ROW_GRID, "py-3")}>
                      <Checkbox
                        id={checkboxId}
                        checked
                        disabled={required}
                        title={
                          required
                            ? "Bioremediation needs this activity"
                            : undefined
                        }
                        onCheckedChange={() => setIncluded(option, false)}
                        className='border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white disabled:opacity-60'
                      />
                      <div>
                        <label
                          htmlFor={checkboxId}
                          className={cn(
                            "text-sm font-medium text-gray-900",
                            !required && "cursor-pointer",
                          )}>
                          {label}
                        </label>
                        {required && (
                          <p className='mt-0.5 text-xs text-gray-500'>
                            Always included: bioremediation sites are treated
                            under it.
                          </p>
                        )}
                        {hasSlabs && (
                          <p className='mt-0.5 text-xs text-gray-500'>
                            Quantity and RC rate are the totals of the distance
                            slabs below.
                          </p>
                        )}
                      </div>
                      <span className='justify-self-start rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700'>
                        {field.unit}
                      </span>
                      {hasSlabs ? (
                        <output
                          aria-label={`${label} estimated quantity`}
                          className={derivedValueClass}>
                          {quantity ? formatQuantity(quantity) : "-"}
                        </output>
                      ) : (
                        <NumberField
                          name={`schedule_of_rates.${index}.estimated_quantity`}
                          label={`${label} estimated quantity`}
                          onValueChange={() => calculateRates(index)}
                        />
                      )}
                      {hasSlabs ? (
                        <output
                          aria-label={`${label} RC rate`}
                          className={derivedValueClass}>
                          {rcRate ? formatAmount(rcRate) : "-"}
                        </output>
                      ) : (
                        <NumberField
                          name={`schedule_of_rates.${index}.rc_unit_rate`}
                          label={`${label} RC rate`}
                          prefix='₹'
                          onValueChange={() => calculateRates(index)}
                        />
                      )}
                      <span className='text-right text-sm tabular-nums text-gray-600'>
                        {rateWithGst ? formatAmount(rateWithGst) : "-"}
                      </span>
                      <span className='text-right text-sm font-semibold tabular-nums text-gray-900'>
                        {total ? formatAmount(total) : "-"}
                      </span>
                    </div>

                    {hasSlabs && (
                      <div className='border-t border-dashed border-gray-200 bg-gray-50/80 py-2'>
                        {TRANSPORT_SLABS.map((slab) => (
                          <div
                            key={slab.key}
                            className={ROW_GRID}>
                            <span />
                            <span className='ml-2 flex items-center self-stretch border-l border-gray-300 pl-4 text-xs text-gray-600'>
                              {slab.label}
                            </span>
                            <span />
                            <div className='py-1'>
                              <NumberField
                                name={`schedule_of_rates.${index}.transportation_slabs.${slab.key}.quantity`}
                                label={`${label} ${slab.label} quantity`}
                                onValueChange={() => sumTransportSlabs(index)}
                                compact
                              />
                            </div>
                            <div className='py-1'>
                              <NumberField
                                name={`schedule_of_rates.${index}.transportation_slabs.${slab.key}.rate`}
                                label={`${label} ${slab.label} rate`}
                                prefix='₹'
                                onValueChange={() => sumTransportSlabs(index)}
                                compact
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                ROW_GRID,
                "border-t border-gray-200 bg-gray-50 py-3",
              )}>
              <span className='col-span-3 text-xs text-gray-500'>
                {fields.length} of {options.length}{" "}
                {options.length === 1 ? "activity" : "activities"} in this work
                order
              </span>
              <span className='col-span-3 text-right text-sm font-medium text-gray-700'>
                SOR total (incl. GST)
              </span>
              <span className='text-right text-base font-semibold tabular-nums text-emerald-700'>
                {formatAmount(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {form.formState.errors.schedule_of_rates && (
          <p className='text-sm text-red-500'>
            {form.formState.errors.schedule_of_rates.message ||
              "Please check the quantity and rate for every activity ticked."}
          </p>
        )}
      </div>

      {/* On phones the hint sits above the buttons rather than squeezed
          beside them. */}
      <div className='flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-xs text-gray-500'>
          {needsRestoration
            ? "Tick at least one restoration activity to continue."
            : missingCount > 0 &&
              `Enter the quantity and RC rate for ${missingCount} more ${
                missingCount === 1 ? "activity" : "activities"
              } to continue.`}
        </p>
        <div className='flex justify-end gap-3'>
          <CustomButton
            type='button'
            text='Back'
            variant='outline'
            onClick={onBack}
            disabled={isLoading}
          />
          <CustomButton
            type='submit'
            text='Create Work Order'
            variant='primary'
            loading={isLoading}
            disabled={
              isLoading ||
              fields.length === 0 ||
              needsRestoration ||
              missingCount > 0
            }
            disableForViewer
          />
        </div>
      </div>
    </div>
  );
};

export default Step2ScheduleOfRates;
