"use client";
import React from "react";
import Link from "next/link";
import { capitalFirstLetter } from "@pkg/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDay } from "./format";

type WorkOrder =
  RouterOutputs["workOrderQuery"]["getAll"]["workOrders"][number];

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const Empty = () => <span className='text-gray-300'>&mdash;</span>;

// Work orders with their codes, client, office, a date and status, each
// leading to its page. The date is when each was last updated, or when it
// ends.
export const WorkOrderTable = ({
  workOrders,
  dateColumn = "updated",
}: {
  workOrders: WorkOrder[];
  dateColumn?: "updated" | "ends";
}) => (
  <Table>
    <TableHeader>
      <TableRow className='border-gray-200 bg-gray-50/60 hover:bg-gray-50/60'>
        <TableHead className='h-8 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
          Code
        </TableHead>
        <TableHead className='hidden h-8 px-3 sm:table-cell text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
          Purchase order
        </TableHead>
        <TableHead className='h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
          Client
        </TableHead>
        <TableHead className='hidden h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 lg:table-cell'>
          Office
        </TableHead>
        <TableHead className='hidden h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 md:table-cell'>
          {dateColumn === "ends" ? "Ends" : "Updated"}
        </TableHead>
        <TableHead className='h-8 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
          Status
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {workOrders.map((wo) => (
        <TableRow
          key={wo.id}
          className='border-gray-100 text-[13px]'>
          <TableCell className='px-4 py-1.5 font-mono font-medium'>
            <Link
              href={`/dashboard/work-order/${wo.id}`}
              className='text-cyan-700 underline-offset-2 hover:underline'>
              {wo.code.toUpperCase()}
            </Link>
          </TableCell>
          <TableCell
            className='hidden max-w-[220px] truncate px-3 sm:table-cell py-1.5 font-mono text-gray-700'
            title={wo.purchase_order_code ?? undefined}>
            {wo.purchase_order_code ?? <Empty />}
          </TableCell>
          <TableCell className='max-w-[140px] truncate px-3 py-1.5 text-gray-600'>
            {wo.client_name ?? <Empty />}
          </TableCell>
          <TableCell className='hidden max-w-[140px] truncate px-3 py-1.5 text-gray-600 lg:table-cell'>
            {wo.office_name ?? <Empty />}
          </TableCell>
          <TableCell className='hidden whitespace-nowrap px-3 py-1.5 text-gray-500 md:table-cell'>
            {formatDay(
              dateColumn === "ends"
                ? wo.end_date
                : (wo.updated_at ?? wo.created_at),
            )}
          </TableCell>
          <TableCell className='px-4 py-1.5 text-right'>
            <Badge
              className={cn(
                "h-5 border px-1.5 text-[11px] font-medium",
                STATUS_STYLES[wo.status],
              )}>
              {capitalFirstLetter(wo.status)}
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
