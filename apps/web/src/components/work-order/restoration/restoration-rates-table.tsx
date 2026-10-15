import React from "react";
import { Rows3 } from "lucide-react";
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

export interface RestorationRate {
  id: number;
  activity: string;
  label: string;
  unit: string;
  estimated_quantity: string | number;
  rc_unit_rate: string | number;
  total_cost: string | number;
}

interface Props {
  rates: RestorationRate[];
  estimatedTotal: number;
  // Quantity recorded against each activity in expenses.
  usedQtyByActivity: Record<string, number>;
}

const headClass = "h-8 px-3 sm:h-8 sm:px-3 text-xs font-medium text-gray-500";
const cellClass = "px-3 py-1.5 sm:px-3 sm:py-1.5 text-[13px]";
const numberClass = cn(cellClass, "text-right tabular-nums text-gray-700");

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(amount) || 0,
  );

const formatQuantity = (value: string | number) =>
  (Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// The restoration activities of the work order's schedule of rates, with how
// much of each the expenses have used.
const RestorationRatesTable = ({
  rates,
  estimatedTotal,
  usedQtyByActivity,
}: Props) => {
  if (rates.length === 0) {
    return (
      <p className='py-10 text-center text-sm text-gray-500'>
        This work order&apos;s schedule of rates has no restoration activities.
      </p>
    );
  }

  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
      <Table>
        <TableHeader>
          <TableRow className='border-gray-200 bg-gray-50 hover:bg-gray-50'>
            <TableHead className={cn(headClass, "font-semibold text-gray-700")}>
              <span className='inline-flex items-center gap-1.5'>
                <Rows3 className='size-3.5 text-gray-400' />
                Schedule of rates
              </span>
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              Est. Qty
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>Used</TableHead>
            <TableHead className={cn(headClass, "text-right")}>Left</TableHead>
            <TableHead className={cn(headClass, "text-right")}>
              RC Rate
            </TableHead>
            <TableHead className={cn(headClass, "text-right")}>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((rate) => {
            const estimated = Number(rate.estimated_quantity) || 0;
            const used = usedQtyByActivity[rate.activity] ?? 0;
            const left = estimated - used;

            return (
              <TableRow
                key={rate.id}
                className='border-gray-100 hover:bg-transparent'>
                <TableCell
                  className={cn(cellClass, "font-medium text-gray-900")}>
                  {rate.label}
                </TableCell>
                <TableCell className={numberClass}>
                  {formatQuantity(estimated)}{" "}
                  <span className='text-xs text-gray-400'>{rate.unit}</span>
                </TableCell>
                <TableCell className={numberClass}>
                  {formatQuantity(used)}
                </TableCell>
                <TableCell
                  className={cn(
                    numberClass,
                    "font-semibold",
                    left > 0 ? "text-emerald-700" : "text-orange-700",
                  )}>
                  {formatQuantity(left)}
                </TableCell>
                <TableCell className={numberClass}>
                  {formatCurrency(rate.rc_unit_rate)}
                </TableCell>
                <TableCell className={numberClass}>
                  {formatCurrency(rate.total_cost)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className='border-gray-200 bg-gray-50 hover:bg-gray-50'>
            <TableCell
              colSpan={5}
              className={cn(cellClass, "font-semibold text-gray-900")}>
              Estimated restoration total (incl. GST)
            </TableCell>
            <TableCell
              className={cn(numberClass, "font-semibold text-gray-900")}>
              {formatCurrency(estimatedTotal)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default RestorationRatesTable;
