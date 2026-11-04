import React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QTY_EPSILON, activityTone, percentOf } from "./restoration-display";

export interface RestorationRate {
  id: number;
  activity: string;
  label: string;
  unit: string;
  estimated_quantity: string | number;
  rc_unit_rate: string | number;
  unit_rate_inc_gst: string | number;
  total_cost: string | number;
  // Transportation's quantity split into its distance slabs.
  transportation_slabs?: Record<string, { quantity: number }> | null;
}

interface Props {
  rates: RestorationRate[];
  estimatedTotal: number;
  // What the job orders' completion certificates have certified, per
  // activity.
  certifiedByActivity: Record<string, number>;
  // What the vendors' expenses have cost, per activity.
  spentByActivity: Record<string, number>;
  // Everything spent on the restoration, activity or not.
  totalSpent: number;
}

const headClass =
  "h-9 px-4 text-xs font-medium whitespace-nowrap text-gray-500";
const cellClass = "px-4 py-2.5 text-[13px] whitespace-nowrap";
const numberClass = cn(cellClass, "text-right tabular-nums text-gray-700");

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(amount) || 0,
  );

const formatQuantity = (value: string | number) =>
  (Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// What is left of an activity's quantity, coloured only once it is used up
// or gone over.
const LeftQuantity = ({
  estimated,
  used,
  unit,
}: {
  estimated: number;
  used: number;
  unit: string;
}) => {
  const left = estimated - used;
  if (left < -QTY_EPSILON) {
    return (
      <span className='font-medium text-rose-600'>
        {formatQuantity(-left)} {unit} over
      </span>
    );
  }
  if (left <= QTY_EPSILON) {
    return <span className='font-medium text-emerald-700'>Done</span>;
  }
  return (
    <>
      {formatQuantity(left)}{" "}
      <span className='text-xs text-gray-400'>{unit}</span>
    </>
  );
};

// The restoration activities of the work order's schedule of rates, in the
// order the work is done. Each shows how much of it the completion
// certificates have used and what that is worth at the RC rate, beside what
// its vendors have cost.
const RestorationRatesTable = ({
  rates,
  estimatedTotal,
  certifiedByActivity,
  spentByActivity,
  totalSpent,
}: Props) => {
  if (rates.length === 0) {
    return (
      <p className='py-10 text-center text-sm text-gray-500'>
        This work order&apos;s schedule of rates has no restoration activities.
      </p>
    );
  }

  const certifiedValue = (rate: RestorationRate) =>
    (certifiedByActivity[rate.activity] ?? 0) *
    (Number(rate.unit_rate_inc_gst) || 0);
  const certifiedTotal = rates.reduce(
    (sum, rate) => sum + certifiedValue(rate),
    0,
  );
  const activitySpent = rates.reduce(
    (sum, rate) => sum + (spentByActivity[rate.activity] ?? 0),
    0,
  );
  // Miscellaneous expenses, recorded without an activity.
  const otherSpent = totalSpent - activitySpent;

  return (
    <div className='space-y-2'>
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
        <Table>
          <TableHeader>
            <TableRow className='border-gray-200 bg-gray-50/80 hover:bg-gray-50/80'>
              <TableHead className={headClass}>Activity</TableHead>
              <TableHead className={cn(headClass, "text-right")}>
                RC rate
              </TableHead>
              <TableHead className={headClass}>Certified</TableHead>
              <TableHead className={cn(headClass, "text-right")}>
                Left
              </TableHead>
              <TableHead className={cn(headClass, "text-right")}>
                Estimated cost
              </TableHead>
              <TableHead className={cn(headClass, "text-right")}>
                Certified value
              </TableHead>
              <TableHead className={cn(headClass, "text-right")}>
                Vendor spend
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate, index) => {
              const estimated = Number(rate.estimated_quantity) || 0;
              const estimatedCost = Number(rate.total_cost) || 0;
              const certified = certifiedByActivity[rate.activity] ?? 0;
              const value = certifiedValue(rate);
              const spent = spentByActivity[rate.activity] ?? 0;
              const tone = activityTone(certified, estimated);

              return (
                <TableRow
                  key={rate.id}
                  className='border-gray-100 hover:bg-gray-50/60'>
                  <TableCell
                    className={cn(cellClass, "min-w-56 whitespace-normal")}>
                    <span className='flex gap-2'>
                      <span className='tabular-nums text-gray-400'>
                        {index + 1}
                      </span>
                      <span className='font-medium text-gray-800'>
                        {rate.label}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className={numberClass}>
                    {formatCurrency(rate.rc_unit_rate)}
                    <span className='text-xs text-gray-400'>
                      {" "}
                      / {rate.unit}
                    </span>
                  </TableCell>
                  <TableCell className={cellClass}>
                    <div className='flex items-center gap-3'>
                      <div className='h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-gray-100'>
                        <div
                          className={cn("h-full rounded-full", tone.bar)}
                          style={{
                            width: `${percentOf(certified, estimated)}%`,
                          }}
                        />
                      </div>
                      <span className={cn("text-xs tabular-nums", tone.text)}>
                        {formatQuantity(certified)} of{" "}
                        {formatQuantity(estimated)} {rate.unit}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={numberClass}>
                    <LeftQuantity
                      estimated={estimated}
                      used={certified}
                      unit={rate.unit}
                    />
                  </TableCell>
                  <TableCell className={numberClass}>
                    {formatCurrency(estimatedCost)}
                  </TableCell>
                  <TableCell
                    className={cn(numberClass, value === 0 && "text-gray-300")}>
                    {value ? formatCurrency(value) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      numberClass,
                      spent === 0 && "text-gray-300",
                      spent > estimatedCost && "text-rose-600",
                    )}>
                    {spent ? formatCurrency(spent) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className='border-gray-200 bg-gray-50/80 hover:bg-gray-50/80'>
              <TableCell
                colSpan={4}
                className={cn(cellClass, "font-semibold text-gray-900")}>
                Total{" "}
                <span className='text-xs font-normal text-gray-400'>
                  incl. GST
                </span>
              </TableCell>
              <TableCell
                className={cn(numberClass, "font-semibold text-gray-900")}>
                {formatCurrency(estimatedTotal)}
              </TableCell>
              <TableCell
                className={cn(numberClass, "font-semibold text-gray-900")}>
                {formatCurrency(certifiedTotal)}
              </TableCell>
              <TableCell
                className={cn(
                  numberClass,
                  "font-semibold",
                  activitySpent > estimatedTotal
                    ? "text-rose-600"
                    : "text-gray-900",
                )}>
                {formatCurrency(activitySpent)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* So the totals add up to the restoration's overall spend. */}
      {otherSpent >= 0.01 && (
        <p className='text-right text-[11px] text-gray-400'>
          Another {formatCurrency(otherSpent)} is spent on miscellaneous
          expenses, outside these activities.
        </p>
      )}
    </div>
  );
};

export default RestorationRatesTable;
