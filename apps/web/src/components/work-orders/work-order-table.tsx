import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  ArrowUp,
  ArrowDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import { useWorkOrderManagementContext } from "@/contexts/WorkOrderManagementContext";
import { useIsViewer } from "@/contexts/AuthContext";
import { IWorkOrder, IWorkOrderPagination } from "@/types/work-order.types";
import { capitalFirstLetter } from "@pkg/utils";
// import { IWorkOrder,IWorkOrderPagination } from "@pkg/schema";

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
  const { workOrderOrder, setWorkOrderOrder } = useWorkOrderManagementContext();
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
        return "bg-green-100 border-green-300";
      case "pending":
        return "bg-yellow-100 border-yellow-300";
      case "cancelled":
        return "bg-red-100 border-red-300";
      default:
        return "";
    }
  };

  const handleTitleSort = () => {
    if (workOrderOrder === "latest") {
      setWorkOrderOrder("oldest");
    } else if (workOrderOrder === "oldest") {
      setWorkOrderOrder("asc");
    } else if (workOrderOrder === "asc") {
      setWorkOrderOrder("desc");
    } else {
      setWorkOrderOrder("latest");
    }
  };

  const getSortIcon = () => {
    if (workOrderOrder === "asc") {
      return <ArrowUp className='h-4 w-4' />;
    } else if (workOrderOrder === "desc") {
      return <ArrowDown className='h-4 w-4' />;
    } else if (workOrderOrder === "latest") {
      return <ArrowDownWideNarrow className='h-4 w-4' />;
    } else {
      return <ArrowUpNarrowWide className='h-4 w-4' />;
    }
  };

  const getSortLabel = () => {
    if (workOrderOrder === "asc") {
      return "A-Z";
    } else if (workOrderOrder === "desc") {
      return "Z-A";
    } else if (workOrderOrder === "latest") {
      return "Latest";
    } else {
      return "Oldest";
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
            <TableHead className='text-xs'>
              <button
                onClick={handleTitleSort}
                className='flex items-center gap-2 hover:text-foreground transition-colors font-medium'>
                Title
                {getSortIcon()}
                <span className='text-xs font-normal text-muted-foreground'>
                  ({getSortLabel()})
                </span>
              </button>
            </TableHead>
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
                    {capitalFirstLetter(workOrder.title)}
                  </TableCell>
                  <TableCell className='text-xs'>
                    {capitalFirstLetter(workOrder.client_name || "-")}
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
                          <span className='sr-only'>Open menu</span>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
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
    </div>
  );
};

export default WorkOrderTable;
