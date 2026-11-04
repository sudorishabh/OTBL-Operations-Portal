"use client";
import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ClipboardList, HardHat, ShoppingCart, Wrench } from "lucide-react";
import { capitalFirstLetter, constants, formatCurrency } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CONTRACTOR_LABELS, type ContractorType } from "./contractor-labels";

const { CONTRACT_ORDER_TYPE } = constants;

interface Props {
  contractorId: number;
  type: ContractorType;
}

// Rows as getContractorWork returns them.
type WorkRow = {
  id: number;
  work_order_id: number;
  work_order_code: string;
  spent: number;
  expense_count: number;
};
type ContractOrderRow = WorkRow & {
  type: string;
  order_number: string;
  order_date: string | Date;
};
type JobOrderRow = WorkRow & {
  jo_number: string;
  title: string;
  start_date: string | Date;
  end_date: string | Date;
};

const headClass = "h-9 px-4 text-xs font-medium text-gray-500";
const cellClass = "px-4 py-2.5 text-sm text-gray-700";

const formatDate = (value: string | Date) =>
  format(new Date(value), "dd MMM yyyy");

const WorkOrderLink = ({ id, code }: { id: number; code: string }) => (
  <Link
    href={`/dashboard/work-order/${id}`}
    className='font-mono text-xs font-medium text-emerald-700 hover:underline'>
    {code.toUpperCase()}
  </Link>
);

const Summary = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='px-4 py-3'>
    <p className='text-xs text-gray-500'>{label}</p>
    <p className='mt-0.5 text-base font-semibold tabular-nums text-gray-900'>
      {value}
    </p>
  </div>
);

// A vendor's or sub-contractor's own page: who they are, and every order and
// job order they are on with what has been spent under each.
const ContractorDetail = ({ contractorId, type }: Props) => {
  const labels = CONTRACTOR_LABELS[type];
  const contractorQuery = trpc.contractorQuery.getContractor.useQuery({
    id: contractorId,
  });
  const workQuery = trpc.contractorQuery.getContractorWork.useQuery({
    id: contractorId,
  });

  const contractor = contractorQuery.data?.contractor;
  const contractOrders = (workQuery.data?.contractOrders ??
    []) as ContractOrderRow[];
  const jobOrders = (workQuery.data?.jobOrders ?? []) as JobOrderRow[];
  const totalSpent = [...contractOrders, ...jobOrders].reduce(
    (sum, row) => sum + row.spent,
    0,
  );

  if (contractorQuery.isLoading) {
    return <p className='py-10 text-center text-sm text-gray-400'>Loading...</p>;
  }
  if (!contractor) {
    return (
      <p className='py-10 text-center text-sm text-gray-400'>
        This {labels.one.toLowerCase()} could not be found.
      </p>
    );
  }

  return (
    <div className='mt-4 space-y-6'>
      <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-3 px-4 py-3'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 ring-1 ring-inset ring-purple-100'>
              <HardHat className='size-4 text-purple-600' />
            </div>
            <div className='min-w-0'>
              <h2 className='truncate text-base font-semibold text-gray-900'>
                {capitalFirstLetter(contractor.name)}
              </h2>
              <p className='text-xs text-gray-500'>
                {[contractor.contact_number, contractor.email, contractor.address]
                  .filter(Boolean)
                  .join(" · ") || "No contact details"}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline'>{labels.one}</Badge>
            <Badge
              className={cn(
                "border",
                contractor.status === "active"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-gray-100 text-gray-600",
              )}>
              {capitalFirstLetter(contractor.status)}
            </Badge>
          </div>
        </div>
        <div className='grid grid-cols-2 divide-x border-t bg-gray-50/60 sm:grid-cols-4'>
          <Summary label='GST' value={contractor.gst_number || "—"} />
          <Summary label='Orders' value={contractOrders.length} />
          <Summary label='Job orders' value={jobOrders.length} />
          <Summary label='Spent with them' value={formatCurrency(totalSpent)} />
        </div>
      </div>

      <section className='space-y-2'>
        <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
          <ShoppingCart className='size-4 text-gray-400' />
          Purchase Orders &amp; Sub-contracts
        </h3>
        {contractOrders.length === 0 ? (
          <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-400'>
            Not on any purchase order or sub-contract yet.
          </p>
        ) : (
          <div className='overflow-x-auto rounded-lg border border-gray-200 bg-white'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50 hover:bg-gray-50'>
                  <TableHead className={headClass}>Order</TableHead>
                  <TableHead className={headClass}>Type</TableHead>
                  <TableHead className={headClass}>Date</TableHead>
                  <TableHead className={headClass}>Work order</TableHead>
                  <TableHead className={cn(headClass, "text-right")}>Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className={cn(cellClass, "font-mono font-medium")}>
                      {order.order_number}
                    </TableCell>
                    <TableCell className={cellClass}>
                      <span className='inline-flex items-center gap-1.5 text-xs'>
                        {order.type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER ? (
                          <ShoppingCart className='size-3.5 text-gray-400' />
                        ) : (
                          <Wrench className='size-3.5 text-gray-400' />
                        )}
                        {order.type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER
                          ? "Purchase order"
                          : "Sub-contract"}
                      </span>
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-xs")}>
                      {formatDate(order.order_date)}
                    </TableCell>
                    <TableCell className={cellClass}>
                      <WorkOrderLink
                        id={order.work_order_id}
                        code={order.work_order_code}
                      />
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-right tabular-nums")}>
                      {formatCurrency(order.spent)}
                      <span className='ml-1 text-xs text-gray-400'>
                        ({order.expense_count})
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className='space-y-2'>
        <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
          <ClipboardList className='size-4 text-gray-400' />
          Restoration Job Orders
        </h3>
        {jobOrders.length === 0 ? (
          <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-400'>
            Not on any job order yet.
          </p>
        ) : (
          <div className='overflow-x-auto rounded-lg border border-gray-200 bg-white'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50 hover:bg-gray-50'>
                  <TableHead className={headClass}>Job order</TableHead>
                  <TableHead className={headClass}>Dates</TableHead>
                  <TableHead className={headClass}>Work order</TableHead>
                  <TableHead className={cn(headClass, "text-right")}>Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobOrders.map((jobOrder) => (
                  <TableRow key={jobOrder.id}>
                    <TableCell className={cellClass}>
                      <span className='font-mono font-medium'>
                        {jobOrder.jo_number}
                      </span>
                      <span className='ml-2 text-gray-500'>{jobOrder.title}</span>
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-xs")}>
                      {formatDate(jobOrder.start_date)} –{" "}
                      {formatDate(jobOrder.end_date)}
                    </TableCell>
                    <TableCell className={cellClass}>
                      <WorkOrderLink
                        id={jobOrder.work_order_id}
                        code={jobOrder.work_order_code}
                      />
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-right tabular-nums")}>
                      {formatCurrency(jobOrder.spent)}
                      <span className='ml-1 text-xs text-gray-400'>
                        ({jobOrder.expense_count})
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ContractorDetail;
