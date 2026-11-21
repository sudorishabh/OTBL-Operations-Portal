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

const WorkOrderTable = ({
  workOrders,
  pagination,
  handleLoadMore,
  isLoadingData,
  onEdit,
}: Props) => {
  const isViewer = useIsViewer();

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: string | null | undefined) => {
    if (!amount) return "₹0";
    const value = parseFloat(amount);
    return `₹${value.toLocaleString("en-IN")}`;
  };

  return (
    <div className={LIST_FRAME}>
      <Table>
        <TableHeader>
          <TableRow className={LIST_HEAD_ROW}>
            <TableHead className={LIST_HEAD}>Code</TableHead>
            <TableHead className={LIST_HEAD}>Purchase Order</TableHead>
            <TableHead className={LIST_HEAD}>Client</TableHead>
            <TableHead className={LIST_HEAD}>Office</TableHead>
            <TableHead className={LIST_HEAD}>Start Date</TableHead>
            <TableHead className={LIST_HEAD}>End Date</TableHead>
            <TableHead className={LIST_HEAD}>Budget</TableHead>
            <TableHead className={LIST_HEAD}>Status</TableHead>
            <TableHead className={cn(LIST_HEAD, "w-12")}>
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders?.length === 0 ? (
            <TableRow className={LIST_ROW}>
              <TableCell
                colSpan={9}
                className={cn(LIST_CELL, "py-8 text-center text-gray-500")}>
                No work orders found
              </TableCell>
            </TableRow>
          ) : (
            workOrders?.map((workOrder) => (
              <TableRow
                key={workOrder.id}
                className={LIST_ROW}>
                <TableCell
                  className={cn(
                    LIST_CELL,
                    "whitespace-nowrap font-medium text-gray-900",
                  )}>
                  <Link
                    href={`/dashboard/work-order/${workOrder.id}`}
                    className={LIST_LINK}>
                    {workOrder.code}
                  </Link>
                </TableCell>
                <TableCell className={LIST_CELL}>
                  {workOrder.purchase_order_code ? (
                    <RecordCode code={workOrder.purchase_order_code} />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className={LIST_CELL}>
                  {workOrder.client_name ? (
                    <Link
                      href={`/dashboard/client/${workOrder.client_id}`}
                      className={LIST_LINK}>
                      {capitalFirstLetter(workOrder.client_name)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className={LIST_CELL}>
                  {capitalFirstLetter(
                    workOrder.office_name || "Unknown Office",
                  )}
                </TableCell>
                <TableCell className={cn(LIST_CELL, "whitespace-nowrap")}>
                  {formatDate(workOrder.start_date)}
                </TableCell>
                <TableCell className={cn(LIST_CELL, "whitespace-nowrap")}>
                  {formatDate(workOrder.end_date)}
                </TableCell>
                <TableCell className={cn(LIST_CELL, "tabular-nums")}>
                  {formatCurrency(workOrder.budget_amount)}
                </TableCell>
                <TableCell className={LIST_CELL}>
                  <ListPill tone={STATUS_TONES[workOrder.status] ?? "gray"}>
                    {capitalFirstLetter(workOrder.status)}
                  </ListPill>
                </TableCell>
                <TableCell className={cn(LIST_CELL, "text-right")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <RowActionsButton
                        label={`Actions for ${workOrder.code}`}
                      />
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
