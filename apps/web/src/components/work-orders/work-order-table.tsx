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
import { Badge } from "@/components/ui/badge";
import { Building2, Edit, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import PaginationSummary from "@/components/shared/pagination-summary";
import { useIsViewer } from "@/contexts/AuthContext";
import { IWorkOrder, IWorkOrderPagination } from "@/types/work-order.types";
import { capitalFirstLetter } from "@pkg/utils";

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 border-green-300 text-green-800";
      case "pending":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "cancelled":
        return "bg-red-100 border-red-300 text-red-700";
      default:
        return "";
    }
  };

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
    <div className='border rounded-lg bg-white'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='pl-8 text-xs'>Code</TableHead>
            <TableHead className='text-xs'>Title</TableHead>
            <TableHead className='text-xs'>Client</TableHead>
            <TableHead className='text-xs'>Office</TableHead>
            <TableHead className='text-xs'>Start Date</TableHead>
            <TableHead className='text-xs'>End Date</TableHead>
            <TableHead className='text-xs'>Budget</TableHead>
            <TableHead className='text-xs'>Status</TableHead>
            <TableHead className='text-xs text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders?.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className='text-center py-8 text-muted-foreground'>
                No work orders found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {workOrders?.map((workOrder) => (
                <TableRow key={workOrder.id}>
                  <TableCell className='text-xs font-medium pl-8'>
                    {workOrder.code}
                  </TableCell>
                  <TableCell className='text-xs font-medium'>
                    <Link
                      href={`/dashboard/work-order/${workOrder.id}`}
                      className='hover:text-emerald-700 hover:underline'>
                      {capitalFirstLetter(workOrder.title)}
                    </Link>
                  </TableCell>
                  <TableCell className='text-xs'>
                    {workOrder.client_name ? (
                      <Link
                        href={`/dashboard/client/${workOrder.client_id}`}
                        className='hover:text-emerald-700 hover:underline'>
                        {capitalFirstLetter(workOrder.client_name)}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className='text-xs'>
                    <Badge
                      variant='outline'
                      className='text-xs'>
                      {capitalFirstLetter(
                        workOrder.office_name || "Unknown Office",
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-xs'>
                    {formatDate(workOrder.start_date)}
                  </TableCell>
                  <TableCell className='text-xs'>
                    {formatDate(workOrder.end_date)}
                  </TableCell>
                  <TableCell className='text-xs'>
                    {formatCurrency(workOrder.budget_amount)}
                  </TableCell>
                  <TableCell className='text-xs'>
                    <Badge
                      variant={getStatusBadgeVariant(workOrder.status)}
                      className={getStatusBadgeClass(workOrder.status)}>
                      {capitalFirstLetter(workOrder.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          className='h-8 w-8 p-0'>
                          <span className='sr-only'>
                            Actions for {workOrder.code}
                          </span>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/work-order/${workOrder.id}`}>
                            <ExternalLink className='mr-2 h-4 w-4' />
                            Open work order
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/client/${workOrder.client_id}`}>
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
              ))}

              {pagination?.hasMore && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className='text-center'>
                    <LoadMoreBtn
                      onClick={handleLoadMore}
                      loading={isLoadingData}
                    />
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>

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
