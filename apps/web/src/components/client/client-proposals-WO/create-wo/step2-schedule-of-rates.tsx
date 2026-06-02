"use client";
import React from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { useFormContext, useFieldArray } from "react-hook-form";
import Input from "@/components/shared/input";

const {
  WO_ACTIVITIES,
  unitOptions,
  GST_PERCENTAGE,
  WO_UNITS,
  WO_PROCESS,
  allActivityOptions,
} = constants;

interface Step2ScheduleOfRatesProps {
  onBack: () => void;
  isLoading: boolean;
}

const Step2ScheduleOfRates: React.FC<Step2ScheduleOfRatesProps> = ({
  onBack,
  isLoading,
}) => {
  const form = useFormContext<workOrderTypes.BaseWorkOrderInput>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "schedule_of_rates",
  });

  const addScheduleOfRate = () => {
    append({
      activity: {
        name: WO_ACTIVITIES.clean_soil_area,
        unit: WO_UNITS.MT,
      },
      unit: WO_UNITS.MT,
      estimated_quantity: 0,
      rc_unit_rate: 0,
      gst_percentage: GST_PERCENTAGE,
      unit_rate_inc_gst: 0,
      total_cost: 0,
      transportation_km: 0,
    });
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

  const selectedProcessType = form.watch("process_type");

  const getFilteredActivityOptions = () => {
    if (selectedProcessType === WO_PROCESS.BIOREMEDIATION) {
      return allActivityOptions.filter((option) => option.isBioremediation);
    } else if (selectedProcessType === WO_PROCESS.RESTORATION) {
      return allActivityOptions.filter((option) => !option.isBioremediation);
    } else {
      return allActivityOptions;
    }
  };

  const filteredActivityOptions = getFilteredActivityOptions();

  const scheduleOfRates = form.watch("schedule_of_rates");
  const hasInvalidActivities = scheduleOfRates?.some(
    (item) =>
      !item.activity?.name ||
      !item.unit ||
      !item.estimated_quantity ||
      Number(item.estimated_quantity) <= 0 ||
      !item.rc_unit_rate ||
      Number(item.rc_unit_rate) <= 0,
  );

  return (
    <div className='flex-1 flex flex-col justify-between h-full'>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>Schedule of Rates</h3>
            <p className='text-sm text-gray-500'>
              GST is fixed at 18%. Rate + GST and Total Cost are calculated
              automatically.
            </p>
          </div>
          <CustomButton
            type='button'
            Icon={Plus}
            text='Add Activity'
            variant='outline'
            onClick={addScheduleOfRate}
            disableForViewer
          />
        </div>

        {fields.length === 0 ? (
          <div className='text-center py-20 text-gray-500 border rounded-lg border-dashed border-gray-400/80'>
            <p className='mb-2 text-sm'>No activities added yet.</p>
            <CustomButton
              type='button'
              Icon={Plus}
              text='Add Your First Activity'
              variant='outline'
              onClick={addScheduleOfRate}
              disableForViewer
            />
          </div>
        ) : (
          <div className='border rounded-lg overflow-auto'>
            <Table className='border-collapse'>
              <TableHeader>
                <TableRow className='bg-gray-100/50'>
                  <TableHead className='h-10 px-4 border-r border-b border-gray-200 text-xs text-gray-700 min-w-[200px]'>
                    Activity *
                  </TableHead>
                  <TableHead className='h-10 px-4 border-r border-b border-gray-200 text-xs text-gray-700 min-w-20'>
                    Unit *
                  </TableHead>
                  <TableHead className='h-10 px-4 border-r border-b border-gray-200 text-xs text-gray-700 min-w-[100px]'>
                    Est. Qty *
                  </TableHead>
                  <TableHead className='h-10 px-4 border-r border-b border-gray-200 text-xs text-gray-700 min-w-[100px]'>
                    RC Rate *
                  </TableHead>
                  <TableHead className='h-10 px-4 border-r border-b border-gray-200 text-xs text-gray-700 min-w-[120px]'>
                    Rate + GST (18%)
                  </TableHead>
                  <TableHead className='h-10 px-4 border-r border-b border-gray-200 text-xs text-gray-700 min-w-[120px]'>
                    Total Cost
                  </TableHead>
                  {fields.some(
                    (_, i) =>
                      form.watch(`schedule_of_rates.${i}.activity.name`) ===
                      WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL,
                  ) && (
                    <TableHead className='h-10 px-4 border-r border-b border-gray-200 text-xs text-gray-700 min-w-[100px]'>
                      Trans. KM *
                    </TableHead>
                  )}
                  <TableHead className='h-10 px-4 border-b border-gray-200 w-[50px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow
                    key={field.id}
                    className='hover:bg-transparent'>
                    <TableCell className='p-0 border-r border-b border-gray-200'>
                      <Input
                        control={form.control}
                        fieldName={`schedule_of_rates.${index}.activity.name`}
                        isSelect
                        selectOptions={filteredActivityOptions}
                        placeholder='Select activity'
                        className='border-none shadow-none focus-visible:ring-0 focus:ring-0 rounded-none w-full h-10 text-xs'
                      />
                    </TableCell>
                    <TableCell className='p-0 border-r border-b border-gray-200'>
                      <Input
                        control={form.control}
                        fieldName={`schedule_of_rates.${index}.unit`}
                        isSelect
                        selectOptions={unitOptions}
                        placeholder='Select unit'
                        onChange={(val) => {
                          form.setValue(
                            `schedule_of_rates.${index}.activity.unit`,
                            val,
                          );
                        }}
                        className='border-none shadow-none focus-visible:ring-0 focus:ring-0 rounded-none w-full h-10 text-xs'
                      />
                    </TableCell>
                    <TableCell className='p-0 border-r border-b border-gray-200'>
                      <Input
                        control={form.control}
                        fieldName={`schedule_of_rates.${index}.estimated_quantity`}
                        type='number'
                        parseValue={Number}
                        onChange={() => calculateRates(index)}
                        className='border-none shadow-none focus-visible:ring-0 focus:ring-0 rounded-none w-full h-10 text-xs'
                      />
                    </TableCell>
                    <TableCell className='p-0 border-r border-b border-gray-200'>
                      <Input
                        control={form.control}
                        fieldName={`schedule_of_rates.${index}.rc_unit_rate`}
                        type='number'
                        parseValue={Number}
                        onChange={() => calculateRates(index)}
                        className='border-none shadow-none focus-visible:ring-0 focus:ring-0 rounded-none w-full h-10 text-xs'
                      />
                    </TableCell>
                    <TableCell className='p-0 border-r border-b border-gray-200'>
                      <Input
                        control={form.control}
                        fieldName={`schedule_of_rates.${index}.unit_rate_inc_gst`}
                        type='number'
                        disabled
                        className='border-none shadow-none focus-visible:ring-0 focus:ring-0 rounded-none w-full h-10 bg-gray-50/50 text-gray-600 pointer-events-none text-xs'
                      />
                    </TableCell>
                    <TableCell className='p-0 border-r border-b border-gray-200'>
                      <Input
                        control={form.control}
                        fieldName={`schedule_of_rates.${index}.total_cost`}
                        type='number'
                        disabled
                        className='border-none shadow-none focus-visible:ring-0 focus:ring-0 rounded-none w-full h-10 bg-gray-50/50 text-gray-600 font-medium pointer-events-none text-xs'
                      />
                    </TableCell>
                    {form.watch(`schedule_of_rates.${index}.activity.name`) ===
                      WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL && (
                      <TableCell className='p-0 border-r border-b border-gray-200'>
                        <Input
                          control={form.control}
                          fieldName={`schedule_of_rates.${index}.transportation_km`}
                          type='number'
                          parseValue={Number}
                          className='border-none shadow-none focus-visible:ring-0 focus:ring-0 rounded-none w-full h-10 text-xs'
                        />
                      </TableCell>
                    )}
                    {fields.some(
                      (_, i) =>
                        form.watch(`schedule_of_rates.${i}.activity.name`) ===
                        WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL,
                    ) &&
                      form.watch(`schedule_of_rates.${index}.activity.name`) !==
                        WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL && (
                        <TableCell className='p-0 border-r border-b border-gray-200'></TableCell>
                      )}
                    <TableCell className='p-1 border-b border-gray-200 custotext-center'>
                      <CustomButton
                        type='button'
                        Icon={Trash2}
                        variant='outline'
                        className='text-red-400 hover:text-red-600 hover:bg-red-50 p-2 h-8 w-8 border-none shadow-none bg-transparent'
                        onClick={() => remove(index)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {form.formState.errors.schedule_of_rates && (
          <p className='text-sm text-red-500'>
            {form.formState.errors.schedule_of_rates.message ||
              (Array.isArray(form.formState.errors.schedule_of_rates)
                ? "Please fill in all required fields for each activity."
                : "At least one schedule of rate entry is required")}
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
