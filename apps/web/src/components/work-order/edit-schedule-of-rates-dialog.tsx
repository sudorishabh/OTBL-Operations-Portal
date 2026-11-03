"use client";
import React, { useState } from "react";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { constants } from "@pkg/utils";
import type { workOrderTypes } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { cn } from "@/lib/utils";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const { TRANSPORT_SLABS, WO_ACTIVITIES, allActivityOptions } = constants;

type SlabKey = (typeof TRANSPORT_SLABS)[number]["key"];

interface SlabDraft {
  quantity: string;
  rate: string;
}

export interface EditableScheduleOfRate {
  id: number;
  work_order_id: number;
  activity: string;
  unit: string;
  estimated_quantity: string;
  rc_unit_rate: string;
  gst_percentage: string;
  transportation_slabs?: workOrderTypes.TransportationSlabs | null;
}

interface RowDraft {
  id: number;
  activity: string;
  unit: string;
  gst: number;
  quantity: string;
  rate: string;
  slabs: Record<SlabKey, SlabDraft> | null;
}

interface Props {
  scheduleOfRates: EditableScheduleOfRate[];
}

const isTransport = (activity: string) =>
  activity === WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL;

const activityLabel = (activity: string) =>
  allActivityOptions.find((option) => option.value === activity)?.label ??
  activity;

const toDraft = (rate: EditableScheduleOfRate): RowDraft => ({
  id: rate.id,
  activity: rate.activity,
  unit: rate.unit,
  gst: Number(rate.gst_percentage) || 0,
  quantity: String(Number(rate.estimated_quantity) || ""),
  rate: String(Number(rate.rc_unit_rate) || ""),
  slabs: isTransport(rate.activity)
    ? (Object.fromEntries(
        TRANSPORT_SLABS.map((slab) => {
          const saved = rate.transportation_slabs?.[slab.key];
          return [
            slab.key,
            {
              quantity: String(saved?.quantity ?? 0),
              rate: String(saved?.rate ?? 0),
            },
          ];
        }),
      ) as Record<SlabKey, SlabDraft>)
    : null,
});

// A transport row's quantity and RC rate are the totals of its distance
// slabs.
const slabTotal = (row: RowDraft, key: keyof SlabDraft) =>
  Object.values(row.slabs ?? {}).reduce(
    (sum, slab) => sum + (Number(slab[key]) || 0),
    0,
  );

const draftQuantity = (row: RowDraft) =>
  row.slabs ? slabTotal(row, "quantity") : Number(row.quantity) || 0;

const draftRate = (row: RowDraft) =>
  row.slabs ? slabTotal(row, "rate") : Number(row.rate) || 0;

const DECIMAL_INPUT = /^[0-9]*[.]?[0-9]*$/;

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

const headClass =
  "h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500";

// Lets an admin correct the quantity and rate of each schedule of rates row.
// The rate including GST and the total are worked out again on save.
const EditScheduleOfRatesDialog = ({ scheduleOfRates }: Props) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const workOrderId = scheduleOfRates[0]?.work_order_id;

  const updateRates = trpc.workOrderMutation.updateScheduleOfRates.useMutation({
    onSuccess: async () => {
      toast.success("Schedule of rates updated");
      setOpen(false);
      await Promise.all([
        utils.workOrderQuery.getWorkOrderDetails.invalidate({
          id: workOrderId,
        }),
        utils.restorationQuery.getRestoration.invalidate(),
      ]);
    },
    onError: (error: unknown) => handleError(error, { showToast: true }),
  });

  const updateRow = (id: number, change: Partial<RowDraft>) =>
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...change } : row)),
    );

  const updateSlab = (
    row: RowDraft,
    key: SlabKey,
    field: keyof SlabDraft,
    value: string,
  ) => {
    if (!row.slabs || !DECIMAL_INPUT.test(value)) return;
    updateRow(row.id, {
      slabs: { ...row.slabs, [key]: { ...row.slabs[key], [field]: value } },
    });
  };

  const save = () => {
    const invalid = rows.find(
      (row) => !(draftQuantity(row) > 0) || !(draftRate(row) > 0),
    );
    if (invalid) {
      toast.error(
        invalid.slabs
          ? `Enter the distance slabs' quantities and rates for ${activityLabel(invalid.activity)}.`
          : `Enter a quantity and rate above zero for ${activityLabel(invalid.activity)}.`,
      );
      return;
    }

    updateRates.mutate({
      work_order_id: workOrderId!,
      rates: rows.map((row) => ({
        id: row.id,
        estimated_quantity: Number(draftQuantity(row).toFixed(2)),
        rc_unit_rate: Number(draftRate(row).toFixed(2)),
        ...(row.slabs && {
          transportation_slabs: Object.fromEntries(
            Object.entries(row.slabs).map(([key, slab]) => [
              key,
              {
                quantity: Number(slab.quantity) || 0,
                rate: Number(slab.rate) || 0,
              },
            ]),
          ) as workOrderTypes.TransportationSlabs,
        }),
      })),
    });
  };

  if (!workOrderId) return null;

  return (
    <>
      <CustomButton
        type='button'
        variant='outline'
        text='Edit rates'
        Icon={Pencil}
        onClick={() => {
          setRows(scheduleOfRates.map(toDraft));
          setOpen(true);
        }}
      />

      <DialogWindow
        title='Edit Schedule of Rates'
        description='Correct the estimated quantity and rate of each activity'
        size='xl'
        heightMode='auto'
        open={open}
        setOpen={(next) => {
          if (!next && !updateRates.isPending) setOpen(false);
        }}>
        <div className='space-y-4'>
          <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
            <Table>
              <TableHeader>
                <TableRow className='border-gray-200 bg-gray-50 hover:bg-gray-50'>
                  <TableHead className={headClass}>Activity</TableHead>
                  <TableHead className={cn(headClass, "w-[180px]")}>
                    Est. Qty
                  </TableHead>
                  <TableHead className={cn(headClass, "w-[130px]")}>
                    RC Rate
                  </TableHead>
                  <TableHead className={cn(headClass, "text-right")}>
                    Rate inc. GST
                  </TableHead>
                  <TableHead className={cn(headClass, "text-right")}>
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const quantity = draftQuantity(row);
                  const rate = draftRate(row);
                  const rateIncGst = rate * (1 + row.gst / 100);
                  return (
                    <TableRow
                      key={row.id}
                      className='border-gray-100 align-top'>
                      <TableCell className='px-3 py-2 text-xs font-medium text-gray-800'>
                        {activityLabel(row.activity)}
                        <span className='ml-1 text-gray-400'>({row.unit})</span>
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        {row.slabs ? (
                          <div className='space-y-1.5'>
                            {TRANSPORT_SLABS.map((slab) => (
                              <label
                                key={slab.key}
                                className='flex items-center gap-2 text-[10px] text-gray-500'>
                                <span className='w-16 shrink-0'>
                                  {slab.label}
                                </span>
                                <Input
                                  inputMode='decimal'
                                  value={row.slabs![slab.key].quantity}
                                  onChange={(e) =>
                                    updateSlab(
                                      row,
                                      slab.key,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className='h-8 text-xs'
                                />
                              </label>
                            ))}
                            <p className='text-[10px] font-medium text-gray-600'>
                              Total {quantity.toLocaleString("en-IN")}
                            </p>
                          </div>
                        ) : (
                          <Input
                            inputMode='decimal'
                            value={row.quantity}
                            onChange={(e) => {
                              if (!DECIMAL_INPUT.test(e.target.value)) return;
                              updateRow(row.id, { quantity: e.target.value });
                            }}
                            className='h-8 text-xs'
                          />
                        )}
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        {/* A transport row's slab rates, beside their
                            quantities, add up to its RC rate. */}
                        {row.slabs ? (
                          <div className='space-y-1.5'>
                            {TRANSPORT_SLABS.map((slab) => (
                              <Input
                                key={slab.key}
                                inputMode='decimal'
                                aria-label={`${slab.label} rate`}
                                value={row.slabs![slab.key].rate}
                                onChange={(e) =>
                                  updateSlab(
                                    row,
                                    slab.key,
                                    "rate",
                                    e.target.value,
                                  )
                                }
                                className='h-8 text-xs'
                              />
                            ))}
                            <p className='text-[10px] font-medium text-gray-600'>
                              Total {formatAmount(rate)}
                            </p>
                          </div>
                        ) : (
                          <Input
                            inputMode='decimal'
                            value={row.rate}
                            onChange={(e) => {
                              if (!DECIMAL_INPUT.test(e.target.value)) return;
                              updateRow(row.id, { rate: e.target.value });
                            }}
                            className='h-8 text-xs'
                          />
                        )}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right text-xs text-gray-600'>
                        {formatAmount(rateIncGst)}
                        <span className='block text-[10px] text-gray-400'>
                          GST {row.gst}%
                        </span>
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right text-xs font-semibold text-gray-900'>
                        {formatAmount(rateIncGst * quantity)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className='flex justify-end gap-2'>
            <CustomButton
              type='button'
              variant='outline'
              text='Cancel'
              disabled={updateRates.isPending}
              onClick={() => setOpen(false)}
            />
            <CustomButton
              type='button'
              variant='primary'
              text='Save rates'
              loading={updateRates.isPending}
              disabled={updateRates.isPending}
              onClick={save}
            />
          </div>
        </div>
      </DialogWindow>
    </>
  );
};

export default EditScheduleOfRatesDialog;
