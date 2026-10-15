"use client";
import React, { useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CustomButton from "@/components/shared/btn";
import { workOrderTypes } from "@pkg/schema";
import { constants } from "@pkg/utils";
import { useFormContext, useFieldArray } from "react-hook-form";
import Input from "@/components/shared/input";

const {
  WO_ACTIVITIES,
  GST_PERCENTAGE,
  WO_PROCESS,
  TRANSPORT_SLABS,
  allActivityOptions,
} = constants;

type ActivityOption = (typeof allActivityOptions)[number];

const cellInputClass =
  "border-none shadow-none focus-visible:ring-0 focus:ring-0 rounded-none w-full h-10 text-xs";
const computedInputClass = `${cellInputClass} bg-gray-50/50 text-gray-600 pointer-events-none`;
const headClass =
  "h-10 px-4 border-r border-b border-gray-200 text-xs text-gray-700";

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

interface Step2ScheduleOfRatesProps {
  onBack: () => void;
  isLoading: boolean;
}

const Step2ScheduleOfRates: React.FC<Step2ScheduleOfRatesProps> = ({
  onBack,
  isLoading,
}) => {
  const form = useFormContext<workOrderTypes.BaseWorkOrderInput>();
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "schedule_of_rates",
  });

  const processType = form.watch("process_type");

  // List exactly the process type's activities, keeping anything already
  // entered if the user comes back to this step.
  useEffect(() => {
    const current = form.getValues("schedule_of_rates") ?? [];
    replace(
      activitiesForProcess(processType).map(
        (option) =>
          current.find((row) => row.activity.name === option.value) ??
          emptyRow(option),
      ),
    );
  }, [form, processType, replace]);

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

  const scheduleOfRates = form.watch("schedule_of_rates");
  const hasInvalidActivities = scheduleOfRates?.some(
    (item) =>
      !item.estimated_quantity ||
      Number(item.estimated_quantity) <= 0 ||
      !item.rc_unit_rate ||
      Number(item.rc_unit_rate) <= 0,
  );

  return (
    <div className='flex-1 flex flex-col justify-between h-full'>
      <div className='space-y-4'>
        <div>
          <h3 className='text-lg font-semibold'>Schedule of Rates</h3>
          <p className='text-sm text-gray-500'>
            Activities follow the work order&apos;s process type. GST is fixed
            at 18%. Rate + GST and Total Cost are calculated automatically.
          </p>
        </div>

        <div className='border rounded-lg overflow-auto'>
          <Table className='border-collapse'>
            <TableHeader>
              <TableRow className='bg-gray-100/50'>
                <TableHead className={`${headClass} min-w-[240px]`}>
                  Activity
                </TableHead>
                <TableHead className={`${headClass} min-w-20`}>Unit</TableHead>
                <TableHead className={`${headClass} min-w-[100px]`}>
                  Est. Qty *
                </TableHead>
                <TableHead className={`${headClass} min-w-[100px]`}>
                  RC Rate *
                </TableHead>
                <TableHead className={`${headClass} min-w-[120px]`}>
                  Rate + GST (18%)
                </TableHead>
                <TableHead className={`${headClass} border-r-0 min-w-[120px]`}>
                  Total Cost
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const option = allActivityOptions.find(
                  (activity) => activity.value === field.activity.name,
                );
                const hasSlabs = isTransportation(field.activity.name);

                return (
                  <React.Fragment key={field.id}>
                    <TableRow className='hover:bg-transparent'>
                      <TableCell className='px-4 py-2 border-r border-b border-gray-200 text-xs font-medium text-gray-800'>
                        {option?.label ?? field.activity.name}
                        {hasSlabs && (
                          <p className='font-normal text-gray-500'>
                            Quantity is the total of the distance slabs below.
                          </p>
                        )}
                      </TableCell>
                      <TableCell className='px-4 border-r border-b border-gray-200 text-xs text-gray-600'>
                        {field.unit}
                      </TableCell>
                      <TableCell className='p-0 border-r border-b border-gray-200'>
                        <Input
                          control={form.control}
                          fieldName={`schedule_of_rates.${index}.estimated_quantity`}
                          type='number'
                          parseValue={Number}
                          disabled={hasSlabs}
                          onChange={() => calculateRates(index)}
                          className={
                            hasSlabs ? computedInputClass : cellInputClass
                          }
                        />
                      </TableCell>
                      <TableCell className='p-0 border-r border-b border-gray-200'>
                        <Input
                          control={form.control}
                          fieldName={`schedule_of_rates.${index}.rc_unit_rate`}
                          type='number'
                          parseValue={Number}
                          onChange={() => calculateRates(index)}
                          className={cellInputClass}
                        />
                      </TableCell>
                      <TableCell className='p-0 border-r border-b border-gray-200'>
                        <Input
                          control={form.control}
                          fieldName={`schedule_of_rates.${index}.unit_rate_inc_gst`}
                          type='number'
                          disabled
                          className={computedInputClass}
                        />
                      </TableCell>
                      <TableCell className='p-0 border-b border-gray-200'>
                        <Input
                          control={form.control}
                          fieldName={`schedule_of_rates.${index}.total_cost`}
                          type='number'
                          disabled
                          className={`${computedInputClass} font-medium`}
                        />
                      </TableCell>
                    </TableRow>

                    {hasSlabs &&
                      TRANSPORT_SLABS.map((slab) => (
                        <TableRow
                          key={slab.key}
                          className='hover:bg-transparent'>
                          <TableCell className='pl-8 pr-4 py-2 border-r border-b border-gray-200 text-xs text-gray-600'>
                            {slab.label}
                          </TableCell>
                          <TableCell className='px-4 border-r border-b border-gray-200 text-xs text-gray-400'>
                            {field.unit}
                          </TableCell>
                          <TableCell className='p-0 border-r border-b border-gray-200'>
                            <Input
                              control={form.control}
                              fieldName={`schedule_of_rates.${index}.transportation_slabs.${slab.key}`}
                              type='number'
                              parseValue={Number}
                              onChange={() => sumTransportSlabs(index)}
                              className={cellInputClass}
                            />
                          </TableCell>
                          <TableCell
                            colSpan={3}
                            className='border-b border-gray-200 bg-gray-50/50'
                          />
                        </TableRow>
                      ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {form.formState.errors.schedule_of_rates && (
          <p className='text-sm text-red-500'>
            {form.formState.errors.schedule_of_rates.message ||
              "Please fill in the quantity and rate for every activity."}
          </p>
        )}
      </div>
      <div className='flex justify-end gap-3 pt-4'>
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
          disabled={isLoading || fields.length === 0 || hasInvalidActivities}
          disableForViewer
        />
      </div>
    </div>
  );
};

export default Step2ScheduleOfRates;
