"use client";
import React, { useState } from "react";
import {
  ArrowUpDown,
  CircleCheck,
  CircleOff,
  ExternalLink,
  FileStack,
  HardHat,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { capitalFirstLetter } from "@pkg/utils";
import type { UseQueryResult } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import useHandleParams from "@/hooks/useHandleParams";
import { useDebounce } from "@/hooks/useDebounce";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import { useIsManager } from "@/contexts/AuthContext";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import Error from "@/components/shared/error";
import NoFetchData from "@/components/shared/no-fetch-data";
import PaginationSummary from "@/components/shared/pagination-summary";
import { Button } from "@/components/ui/button";
import { VendorsTableSkeleton } from "@/components/skeleton/vendor/vendor-skeletons";
import {
  ALL,
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import VendorDialog from "./vendor-dialog";
import { VENDOR_DESCRIPTION } from "./vendor-labels";

type Vendor = {
  id: number;
  name: string;
  contact_number: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  pan_number: string | null;
  status: string;
};

type VendorsPage = {
  vendors: Vendor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: "All statuses", value: ALL },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

// Which orders, in work orders the user can see, a vendor is on.
const USAGE_OPTIONS = [
  { label: "Any orders", value: ALL },
  { label: "On purchase orders", value: "purchase_order" },
  { label: "On sub-contracts", value: "sub_contract" },
  { label: "On job orders", value: "job_order" },
  { label: "Not on any order", value: "unused" },
];

const SORT_OPTIONS = [
  { label: "Name A–Z", value: "name_asc" },
  { label: "Name Z–A", value: "name_desc" },
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
];

type VendorUsage = "purchase_order" | "sub_contract" | "job_order" | "unused";
type VendorSort = "name_asc" | "name_desc" | "newest" | "oldest";

const headClass = "h-10 px-4 sm:h-10 sm:px-4 text-xs font-medium text-gray-500";
const cellClass = "px-4 py-3 sm:px-4 sm:py-3 text-sm text-gray-700";

// The vendors page: everyone material and work are ordered from.
const VendorPage = () => {
  const { setParams } = useHandleParams();
  const isManager = useIsManager();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [usage, setUsage] = useState<string>(ALL);
  const [sort, setSort] = useState<VendorSort>("name_asc");
  const debouncedSearch = useDebounce(search, 300);
  const [deleting, setDeleting] = useState<Vendor | null>(null);

  const queryInput = {
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    status: status === ALL ? undefined : (status as "active" | "inactive"),
    usage: usage === ALL ? undefined : (usage as VendorUsage),
    sort,
  };

  const { pages, loadMore } = useLoadMorePages(queryInput);

  const pageQueries: UseQueryResult<VendorsPage>[] = trpc.useQueries((t: any) =>
    pages.map((page) => t.contractorQuery.getVendors({ ...queryInput, page })),
  );

  const vendors = pageQueries.flatMap((query) => query.data?.vendors ?? []);
  const pagination = pageQueries
    .flatMap((query) => query.data?.pagination ?? [])
    .at(-1);
  const failedQuery = pageQueries.find((query) => query.isError);
  const isInitialLoading = !!pageQueries[0]?.isLoading;
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;
  const isFiltered = !!queryInput.search || status !== ALL || usage !== ALL;

  const deleteVendor = trpc.contractorMutation.deleteContractor.useMutation({
    onSuccess: () => {
      toast.success("Vendor deleted");
      utils.contractorQuery.invalidate();
    },
    onError: (error: { message: string }) => toast.error(error.message),
    onSettled: () => setDeleting(null),
  });

  const setVendorStatus = trpc.contractorMutation.updateContractor.useMutation({
    onSuccess: (_data: unknown, variables: { status?: string }) => {
      toast.success(
        variables.status === "active"
          ? "Vendor marked active"
          : "Vendor marked inactive",
      );
      utils.contractorQuery.invalidate();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  // Clearing the filters keeps the chosen order.
  const resetFilters = () => {
    setSearch("");
    setStatus(ALL);
    setUsage(ALL);
  };

  const renderList = () => {
    if (isInitialLoading) {
      return <VendorsTableSkeleton withActions />;
    }

    if (failedQuery) {
      return (
        <Error
          variant='inline'
          message={failedQuery.error?.message || "Failed to load vendors"}
        />
      );
    }

    if (vendors.length === 0) {
      return (
        <NoFetchData
          Icon={HardHat}
          title={isFiltered ? "No matching vendors" : "No vendors yet"}
          description={
            isFiltered
              ? "Try another search or clear the filters."
              : VENDOR_DESCRIPTION
          }
        />
      );
    }

    return (
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
        <Table>
          <TableHeader>
            <TableRow className='border-gray-200 bg-gray-50 hover:bg-gray-50'>
              <TableHead className={headClass}>Vendor</TableHead>
              <TableHead className={headClass}>Contact</TableHead>
              <TableHead className={headClass}>GST / PAN</TableHead>
              <TableHead className={headClass}>Status</TableHead>
              <TableHead className={cn(headClass, "w-12")}>
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow
                key={vendor.id}
                className='border-gray-100'>
                <TableCell className={cellClass}>
                  <p className='font-medium text-gray-900'>
                    <Link
                      href={`/dashboard/vendor/${vendor.id}`}
                      className='hover:text-emerald-700 hover:underline'>
                      {capitalFirstLetter(vendor.name)}
                    </Link>
                  </p>
                  {vendor.address && (
                    <p
                      className='max-w-xs truncate text-xs text-gray-400'
                      title={vendor.address}>
                      {vendor.address}
                    </p>
                  )}
                </TableCell>
                <TableCell className={cellClass}>
                  <p>{vendor.contact_number || "—"}</p>
                  {vendor.email && (
                    <p className='text-xs text-gray-400'>{vendor.email}</p>
                  )}
                </TableCell>
                <TableCell className={cn(cellClass, "tabular-nums")}>
                  <p>{vendor.gst_number || "—"}</p>
                  {vendor.pan_number && (
                    <p className='text-xs text-gray-400'>{vendor.pan_number}</p>
                  )}
                </TableCell>
                <TableCell className={cellClass}>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      vendor.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500",
                    )}>
                    {capitalFirstLetter(vendor.status)}
                  </span>
                </TableCell>
                <TableCell className={cn(cellClass, "text-right")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        className='h-8 w-8 p-0'>
                        <span className='sr-only'>
                          Actions for {vendor.name}
                        </span>
                        <MoreHorizontal className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/vendor/${vendor.id}`}>
                          <ExternalLink className='mr-2 h-4 w-4' />
                          View orders and expenses
                        </Link>
                      </DropdownMenuItem>
                      {isManager && (
                        <>
                          <DropdownMenuItem
                            onClick={() =>
                              setParams({
                                dialog: "edit-vendor",
                                vendorId: String(vendor.id),
                              })
                            }>
                            <Pencil className='mr-2 h-4 w-4' />
                            Edit vendor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={setVendorStatus.isPending}
                            onClick={() =>
                              setVendorStatus.mutate({
                                id: vendor.id,
                                status:
                                  vendor.status === "active"
                                    ? "inactive"
                                    : "active",
                              })
                            }>
                            {vendor.status === "active" ? (
                              <CircleOff className='mr-2 h-4 w-4' />
                            ) : (
                              <CircleCheck className='mr-2 h-4 w-4' />
                            )}
                            {vendor.status === "active"
                              ? "Mark inactive"
                              : "Mark active"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className='text-red-600 focus:text-red-600'
                            onClick={() => setDeleting(vendor)}>
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete vendor
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {pagination?.hasMore && (
          <div className='flex justify-center border-t py-3'>
            <LoadMoreBtn
              onClick={loadMore}
              loading={isFetchingMore}
            />
          </div>
        )}
        <PaginationSummary
          shown={vendors.length}
          total={pagination?.total}
          page={pagination?.page}
          totalPages={pagination?.totalPages}
          noun='vendors'
          className='border-t'
        />
      </div>
    );
  };

  return (
    <div className='mt-4 space-y-4'>
      <FilterBar>
        <SearchFilter
          label='Search vendors'
          placeholder='Search by name, contact, email or GST'
          value={search}
          onChange={setSearch}
        />
        <SelectFilter
          label='Status'
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
        <SelectFilter
          label='Orders'
          Icon={FileStack}
          value={usage}
          onChange={setUsage}
          options={USAGE_OPTIONS}
        />
        <SelectFilter
          label='Sort vendors'
          Icon={ArrowUpDown}
          value={sort}
          onChange={(value) => setSort(value as VendorSort)}
          options={SORT_OPTIONS}
          defaultValue={null}
        />
        {isFiltered && <ClearFiltersButton onClick={resetFilters} />}
      </FilterBar>

      {renderList()}

      <VendorDialog />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Expenses and orders recorded with this vendor keep their amounts
              but no longer name it. To keep its history, set it to inactive
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 text-white hover:bg-red-700'
              onClick={() =>
                deleting && deleteVendor.mutate({ id: deleting.id })
              }>
              Delete vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorPage;
