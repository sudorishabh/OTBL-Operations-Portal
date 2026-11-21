import React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Edit, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PaginationSummary from "@/components/shared/pagination-summary";
import RecordCode from "@/components/shared/record-code";
import {
  LIST_CELL,
  LIST_FRAME,
  LIST_HEAD,
  LIST_HEAD_ROW,
  LIST_LINK,
  LIST_ROW,
  LIST_SUBTEXT,
  ListLoadMore,
  ListPill,
  RowActionsButton,
  type PillTone,
} from "@/components/shared/list-table";
import { useIsViewer } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { IWorkOrder, IWorkOrderPagination } from "@/types/work-order.types";
import { capitalFirstLetter } from "@pkg/utils";

// The same colours the overview gives each status.
const STATUS_TONES: Record<string, PillTone> = {
  completed: "green",
  pending: "yellow",
};

interface Props {
  workOrders: IWorkOrder[];
  pagination: IWorkOrderPagination | null;
  handleLoadMore: () => void;
  isLoadingData: boolean;
  onEdit?: (workOrder: IWorkOrder) => void;
}

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatCurrency = (amount: string | null | undefined) => {
  if (!amount) return "₹0";
  return `₹${parseFloat(amount).toLocaleString("en-IN")}`;
};

const officeName = (workOrder: IWorkOrder) =>
  capitalFirstLetter(workOrder.office_name || "Unknown Office");

const StatusPill = ({ workOrder }: { workOrder: IWorkOrder }) => (
  <ListPill tone={STATUS_TONES[workOrder.status] ?? "gray"}>
    {capitalFirstLetter(workOrder.status)}
  </ListPill>
);

// The ⋯ menu on a work order's row or card.
const WorkOrderActions = ({
  workOrder,
  onEdit,
}: {
  workOrder: IWorkOrder;
  onEdit?: (workOrder: IWorkOrder) => void;
}) => {
  const isViewer = useIsViewer();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <RowActionsButton label={`Actions for ${workOrder.code}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/work-order/${workOrder.id}`}>
            <ExternalLink className='mr-2 h-4 w-4' />
            Open work order
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/client/${workOrder.client_id}`}>
            <Building2 className='mr-2 h-4 w-4' />
            Open client
          </Link>
        </DropdownMenuItem>
        {onEdit && (
          <DropdownMenuItem
            disabled={isViewer}
            onClick={() => onEdit(workOrder)}>
            <Edit className='mr-2 h-4 w-4' />
            Edit Work Order
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// A work order on a phone: the whole card opens it, and the ⋯ menu sits above
// that link so it still opens on its own.
const WorkOrderCard = ({
  workOrder,
  onEdit,
}: {
  workOrder: IWorkOrder;
  onEdit?: (workOrder: IWorkOrder) => void;
}) => (
  <li className='relative flex items-start gap-2 px-4 py-3 transition-colors hover:bg-gray-50'>
    <div className='min-w-0 flex-1 space-y-1.5'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
        <Link
          href={`/dashboard/work-order/${workOrder.id}`}
          className='text-sm font-semibold text-gray-900 after:absolute after:inset-0'>
          {workOrder.code}
        </Link>
        <StatusPill workOrder={workOrder} />
      </div>
      {workOrder.purchase_order_code && (
        <RecordCode code={workOrder.purchase_order_code} />
      )}
      <div className='min-w-0 text-sm'>
        <p className='truncate text-gray-800'>
          {workOrder.client_name
            ? capitalFirstLetter(workOrder.client_name)
            : "—"}
        </p>
        <p className={cn(LIST_SUBTEXT, "truncate")}>{officeName(workOrder)}</p>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-500'>
        <span>
          {formatDate(workOrder.start_date)} – {formatDate(workOrder.end_date)}
        </span>
        <span className='font-medium tabular-nums text-gray-900'>
          {formatCurrency(workOrder.budget_amount)}
        </span>
      </div>
    </div>
    <div className='relative z-10 -mr-2 -mt-1'>
      <WorkOrderActions
        workOrder={workOrder}
        onEdit={onEdit}
      />
    </div>
  </li>
);

const WorkOrderTable = ({
  workOrders,
  pagination,
  handleLoadMore,
  isLoadingData,
  onEdit,
}: Props) => {
  const empty = workOrders?.length === 0;

  return (
    <div className={LIST_FRAME}>
      {/* Phones get cards; the table needs a tablet's width. */}
      <ul className='divide-y divide-gray-100 md:hidden'>
        {empty ? (
          <li className='px-4 py-8 text-center text-sm text-gray-500'>
            No work orders found
          </li>
        ) : (
          workOrders?.map((workOrder) => (
            <WorkOrderCard
              key={workOrder.id}
              workOrder={workOrder}
              onEdit={onEdit}
            />
          ))
        )}
      </ul>

      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow className={LIST_HEAD_ROW}>
              <TableHead className={LIST_HEAD}>Work order</TableHead>
              <TableHead className={LIST_HEAD}>Client</TableHead>
              <TableHead className={LIST_HEAD}>Dates</TableHead>
              <TableHead className={cn(LIST_HEAD, "text-right")}>
                Budget
              </TableHead>
              <TableHead className={LIST_HEAD}>Status</TableHead>
              <TableHead className={cn(LIST_HEAD, "w-12")}>
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empty ? (
              <TableRow className={LIST_ROW}>
                <TableCell
                  colSpan={6}
                  className={cn(LIST_CELL, "py-8 text-center text-gray-500")}>
                  No work orders found
                </TableCell>
              </TableRow>
            ) : (
              workOrders?.map((workOrder) => (
                <TableRow
                  key={workOrder.id}
                  className={LIST_ROW}>
                  <TableCell className={LIST_CELL}>
                    <Link
                      href={`/dashboard/work-order/${workOrder.id}`}
                      className={cn(
                        LIST_LINK,
                        "whitespace-nowrap font-medium text-gray-900",
                      )}>
                      {workOrder.code}
                    </Link>
                    {workOrder.purchase_order_code && (
                      <div className='mt-1'>
                        <RecordCode code={workOrder.purchase_order_code} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={cn(LIST_CELL, "min-w-44")}>
                    {workOrder.client_name ? (
                      <Link
                        href={`/dashboard/client/${workOrder.client_id}`}
                        className={LIST_LINK}>
                        {capitalFirstLetter(workOrder.client_name)}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <p className={LIST_SUBTEXT}>{officeName(workOrder)}</p>
                  </TableCell>
                  <TableCell className={cn(LIST_CELL, "whitespace-nowrap")}>
                    {formatDate(workOrder.start_date)}
                    <p className={LIST_SUBTEXT}>
                      to {formatDate(workOrder.end_date)}
                    </p>
                  </TableCell>
                  <TableCell
                    className={cn(
                      LIST_CELL,
                      "whitespace-nowrap text-right tabular-nums",
                    )}>
                    {formatCurrency(workOrder.budget_amount)}
                  </TableCell>
                  <TableCell className={LIST_CELL}>
                    <StatusPill workOrder={workOrder} />
                  </TableCell>
                  <TableCell className={cn(LIST_CELL, "text-right")}>
                    <WorkOrderActions
                      workOrder={workOrder}
                      onEdit={onEdit}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {workOrders.length > 0 && pagination?.hasMore && (
        <ListLoadMore
          onClick={handleLoadMore}
          loading={isLoadingData}
        />
      )}
      <PaginationSummary
        shown={workOrders.length}
        total={pagination?.total}
        page={pagination?.page}
        totalPages={pagination?.totalPages}
        noun='work orders'
        className='border-t'
      />
    </div>
  );
};

export default WorkOrderTable;
