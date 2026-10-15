"use client";
import React, { useEffect, useState } from "react";
import {
  useController,
  useFieldArray,
  useFormContext,
  type FieldPath,
} from "react-hook-form";
import CustomButton from "@/components/shared/btn";
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

// Columns: Activity | Unit | Est. Qty | RC Rate | Rate + GST | Total
const ROW_GRID =
  "grid grid-cols-[minmax(12rem,1fr)_4.5rem_8rem_8.5rem_7.5rem_8.5rem] items-center gap-x-3 px-4";

const formatAmount = (value: number) =>
  value.toLocaleString("en-IN", { style: "currency", currency: "INR" });

const formatQuantity = (value: number) =>
  value.toLocaleString("en-IN", { maximumFractionDigits: 2 });

const isTransportation = (activity: string) =>
  activity === WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL;

// The activities a work order of this process type is billed for.
const activitiesForProcess = (processType?: string) => {
  if (processType === WO_PROCESS.BIOREMEDIATION) {
    return allActivityOptions.filter((option) => option.isBioremediation);
  }
  if (processType === WO_PROCESS.RESTORATION) {
    return allActivityOptions.filter((option) => !option.isBioremediation);
  }
  return allActivityOptions;
};

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
    transportation_slabs: { up_to_5_km: 0, over_20_km: 0, over_40_km: 0 },
  }),
});

const isIncomplete = (row: workOrderTypes.ScheduleOfRateInput) =>
  !(Number(row.estimated_quantity) > 0) || !(Number(row.rc_unit_rate) > 0);

interface NumberFieldProps {
  name: FieldPath<FormValues>;
  label: string;
  prefix?: string;
  onValueChange: () => void;
  className?: string;
}

// A numeric field that starts blank rather than showing 0.
const NumberField = ({
  name,
  label,
  prefix,
  onValueChange,
  className,
}: NumberFieldProps) => {
  const { control } = useFormContext<FormValues>();
  const { field } = useController({ control, name });
  const [text, setText] = useState(() =>
    Number(field.value) ? String(field.value) : "",
  );

  return (
    <div className='relative'>
      {prefix && (
        <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>
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
          "h-9 bg-white text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          prefix && "pl-7",
          className,
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
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "schedule_of_rates",
  });

  const processType = form.watch("process_type");
  // `form` is a new object every render, so depend on its stable getValues.
  const { getValues } = form;

  // List exactly the process type's activities, keeping anything already
  // entered if the user comes back to this step.
  useEffect(() => {
    const current = getValues("schedule_of_rates") ?? [];
    const activities = activitiesForProcess(processType);
    const isInSync =
      current.length === activities.length &&
      activities.every(
        (option, i) => current[i]?.activity.name === option.value,
      );
    if (isInSync) return;

    replace(
      activities.map(
        (option) =>
          current.find((row) => row.activity.name === option.value) ??
          emptyRow(option),
      ),
    );
  }, [getValues, processType, replace]);

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

  // Transportation's quantity is the total of its distance slabs.
  const sumTransportSlabs = (index: number) => {
    const slabs = form.getValues(
      `schedule_of_rates.${index}.transportation_slabs`,
    );
    const total = Object.values(slabs ?? {}).reduce(
      (sum, qty) => sum + (Number(qty) || 0),
      0,
    );
    form.setValue(
      `schedule_of_rates.${index}.estimated_quantity`,
      Number(total.toFixed(2)),
    );
    calculateRates(index);
  };

  const scheduleOfRates = form.watch("schedule_of_rates") ?? [];
  const grandTotal = scheduleOfRates.reduce(
    (sum, row) => sum + (Number(row.total_cost) || 0),
    0,
  );
  const missingCount = scheduleOfRates.filter(isIncomplete).length;

  return (
    <div className='flex-1 flex flex-col justify-between h-full'>
      <div className='space-y-4'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900'>
            Schedule of Rates
          </h3>
          <p className='text-sm text-gray-500'>
            Every activity for this process type is listed. GST is fixed at
            18%, so Rate + GST and Total are calculated for you.
          </p>
        </div>

        <div className='overflow-x-auto rounded-lg border border-gray-200'>
          <div className='min-w-[54rem]'>
            <div
              className={cn(
                ROW_GRID,
                "border-b border-gray-200 bg-gray-50 py-2.5 text-xs font-medium text-gray-500",
              )}>
              <span>Activity</span>
              <span>Unit</span>
              <span className='text-right'>Est. Qty</span>
              <span className='text-right'>RC Rate</span>
              <span className='text-right'>Rate + GST</span>
              <span className='text-right'>Total</span>
            </div>

            <div className='divide-y divide-gray-100'>
              {fields.map((field, index) => {
                const option = allActivityOptions.find(
                  (activity) => activity.value === field.activity.name,
                );
                const label = option?.label ?? field.activity.name;
                const hasSlabs = isTransportation(field.activity.name);
                const row = scheduleOfRates[index];
                const quantity = Number(row?.estimated_quantity) || 0;
                const rateWithGst = Number(row?.unit_rate_inc_gst) || 0;
                const total = Number(row?.total_cost) || 0;

                return (
                  <div
                    key={field.id}
                    className={cn(hasSlabs && "pb-3")}>
                    <div className={cn(ROW_GRID, "py-3")}>
                      <div>
                        <p className='text-sm font-medium text-gray-900'>
                          {label}
                        </p>
                        {hasSlabs && (
                          <p className='mt-0.5 text-xs text-gray-500'>
                            Quantity is the total of the distance slabs.
                          </p>
                        )}
                      </div>
                      <span className='justify-self-start rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700'>
                        {field.unit}
                      </span>
                      {hasSlabs ? (
                        <output
                          aria-label={`${label} estimated quantity`}
                          className='flex h-9 items-center justify-end rounded-md bg-gray-50 px-3 text-sm font-medium tabular-nums text-gray-800'>
                          {formatQuantity(quantity)}
                        </output>
                      ) : (
                        <NumberField
                          name={`schedule_of_rates.${index}.estimated_quantity`}
                          label={`${label} estimated quantity`}
                          onValueChange={() => calculateRates(index)}
                        />
                      )}
                      <NumberField
                        name={`schedule_of_rates.${index}.rc_unit_rate`}
                        label={`${label} RC rate`}
                        prefix='₹'
                        onValueChange={() => calculateRates(index)}
                      />
                      <span className='text-right text-sm tabular-nums text-gray-600'>
                        {rateWithGst ? formatAmount(rateWithGst) : "-"}
                      </span>
                      <span className='text-right text-sm font-semibold tabular-nums text-gray-900'>
                        {total ? formatAmount(total) : "-"}
                      </span>
                    </div>

                    {hasSlabs &&
                      TRANSPORT_SLABS.map((slab) => (
                        <div
                          key={slab.key}
                          className={ROW_GRID}>
                          <span className='ml-2 flex items-center self-stretch border-l border-gray-200 py-1 pl-4 text-xs text-gray-600'>
                            {slab.label}
                          </span>
                          <span />
                          <div className='py-1'>
                            <NumberField
                              name={`schedule_of_rates.${index}.transportation_slabs.${slab.key}`}
                              label={`${label} ${slab.label} quantity`}
                              onValueChange={() => sumTransportSlabs(index)}
                              className='h-8'
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                ROW_GRID,
                "border-t border-gray-200 bg-gray-50 py-3",
              )}>
              <span className='col-span-5 text-right text-sm font-medium text-gray-700'>
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
              "Please check the quantity and rate for every activity."}
          </p>
        )}
      </div>

      <div className='flex items-center justify-between gap-3 pt-4'>
        <p className='text-xs text-gray-500'>
          {missingCount > 0 &&
            `Enter the quantity and RC rate for ${missingCount} more ${
              missingCount === 1 ? "activity" : "activities"
            } to continue.`}
        </p>
        <div className='flex gap-3'>
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
            disabled={isLoading || fields.length === 0 || missingCount > 0}
            disableForViewer
          />
        </div>
      </div>
    </div>
  );
};

export default Step2ScheduleOfRates;
