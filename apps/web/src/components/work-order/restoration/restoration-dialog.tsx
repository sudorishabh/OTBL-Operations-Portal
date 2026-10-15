"use client";
import React from "react";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
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
  label: string;
  unit: string;
  estimated_quantity: string | number;
  rc_unit_rate: string | number;
  total_cost: string | number;
}

interface Props {
  rates: RestorationRate[];
  estimatedTotal: number;
}

const headClass = "h-10 px-4 sm:h-10 sm:px-4 text-xs font-medium text-gray-500";
const cellClass = "px-4 py-3 sm:px-4 sm:py-3";
const numberClass = cn(cellClass, "text-right tabular-nums text-gray-700");

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(amount) || 0,
  );

const formatQuantity = (value: string | number) =>
  (Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// The one place restoration work is managed, as it has no sites.
const RestorationDialog = ({ rates, estimatedTotal }: Props) => {
  const { getParam, deleteParam } = useHandleParams();
  const isOpen = getParam("dialog") === "restoration";

  return (
    <DialogWindow
      open={isOpen}
      setOpen={(open) => {
        if (!open) deleteParam("dialog");
      }}
      title='Restoration'
      description='Restoration activities from the schedule of rates.'
      size='lg'>
      {rates.length === 0 ? (
        <p className='py-10 text-center text-sm text-gray-500'>
          This work order&apos;s schedule of rates has no restoration
          activities.
        </p>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
          <Table>
            <TableHeader>
              <TableRow className='border-gray-200 bg-gray-50 hover:bg-gray-50'>
                <TableHead className={headClass}>Activity</TableHead>
                <TableHead className={cn(headClass, "text-right")}>
                  Est. Qty
                </TableHead>
                <TableHead className={cn(headClass, "text-right")}>
                  RC Rate
                </TableHead>
                <TableHead className={cn(headClass, "text-right")}>
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow
                  key={rate.id}
                  className='border-gray-100 hover:bg-transparent'>
                  <TableCell
                    className={cn(
                      cellClass,
                      "text-sm font-medium text-gray-900",
                    )}>
                    {rate.label}
                  </TableCell>
                  <TableCell className={numberClass}>
                    {formatQuantity(rate.estimated_quantity)}{" "}
                    <span className='text-xs text-gray-400'>{rate.unit}</span>
                  </TableCell>
                  <TableCell className={numberClass}>
                    {formatCurrency(rate.rc_unit_rate)}
                  </TableCell>
                  <TableCell className={numberClass}>
                    {formatCurrency(rate.total_cost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className='border-gray-200 bg-gray-50 hover:bg-gray-50'>
                <TableCell
                  colSpan={3}
                  className={cn(
                    cellClass,
                    "text-sm font-semibold text-gray-900",
                  )}>
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
      )}
    </DialogWindow>
  );
};

export default RestorationDialog;
