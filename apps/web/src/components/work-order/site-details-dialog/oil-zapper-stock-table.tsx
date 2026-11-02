"use client";
import React from "react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const { OIL_ZAPPER, WO_UNITS } = constants;

interface Props {
  woSiteId: number;
}

const formatQty = (value: number) =>
  Number(value.toFixed(2)).toLocaleString("en-IN");

const headClass =
  "text-[10px] font-semibold text-gray-600 whitespace-nowrap text-right";
const cellClass = "py-2 text-xs text-gray-600 text-right tabular-nums whitespace-nowrap";

// A bioremediation site's oil zapper: estimated with the site, procured
// through its expenses, used by its oil zapping entries, and what is left.
const OilZapperStockTable = ({ woSiteId }: Props) => {
  const stockQuery = trpc.workOrderSiteQuery.getOilZapperStock.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId },
  );
  const stock = stockQuery.data;

  // Hidden until the estimate plans the site's oil zapper.
  if (!stock || stock.estimated === null) return null;

  const unit = OIL_ZAPPER.UNIT.toUpperCase();
  const isOverProcured = stock.procured > stock.estimated;

  return (
    <div className='rounded-lg border border-slate-200 bg-slate-50/40 overflow-hidden'>
      <div className='px-3 py-2 border-b bg-white'>
        <p className='text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap'>
          {OIL_ZAPPER.LABEL} Stock
        </p>
        <p className='text-[9px] text-slate-400 mt-0.5'>
          Procured from expenses · Used from oil zapping entries · Left =
          Procured − Used
        </p>
      </div>

      <div className='bg-white overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='bg-gray-50/60 hover:bg-gray-50/60'>
              <TableHead className={cn(headClass, "text-left")}>
                Activity
              </TableHead>
              <TableHead className={headClass}>SOR Qty</TableHead>
              <TableHead className={headClass}>
                Estimated {OIL_ZAPPER.LABEL} Qty
              </TableHead>
              <TableHead className={headClass}>Procured</TableHead>
              <TableHead className={headClass}>Used</TableHead>
              <TableHead className={headClass}>Left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className='hover:bg-blue-50/20'>
              <TableCell className='py-2 text-xs text-gray-700 font-medium whitespace-nowrap'>
                Bioremediation
              </TableCell>
              <TableCell className={cellClass}>
                {stock.sorQuantity !== null
                  ? `${formatQty(stock.sorQuantity)} ${WO_UNITS.MT}`
                  : "—"}
              </TableCell>
              <TableCell className={cellClass}>
                {formatQty(stock.estimated)} {unit}
              </TableCell>
              <TableCell
                className={cn(
                  cellClass,
                  isOverProcured && "text-orange-700 font-semibold",
                )}
                title={
                  isOverProcured
                    ? "More oil zapper procured than estimated"
                    : undefined
                }>
                {formatQty(stock.procured)} {unit}
              </TableCell>
              <TableCell className={cellClass}>
                {formatQty(stock.used)} {unit}
              </TableCell>
              <TableCell
                className={cn(
                  cellClass,
                  "font-semibold",
                  stock.left > 0 ? "text-emerald-700" : "text-orange-700",
                )}>
                {formatQty(stock.left)} {unit}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OilZapperStockTable;
