"use client";
import React, { useState } from "react";
import { HardHat, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
import type { UseQueryResult } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import useHandleParams from "@/hooks/useHandleParams";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsManager } from "@/contexts/AuthContext";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import Error from "@/components/shared/error";
import NoFetchData from "@/components/shared/no-fetch-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import VendorDialog from "./vendor-dialog";

type Vendor = {
  id: number;
  name: string;
  office_name: string | null;
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

type OfficeOption = { id: number; name: string };

const PAGE_SIZE = 20;
const ALL = "all";

const headClass = "h-10 px-4 sm:h-10 sm:px-4 text-xs font-medium text-gray-500";
const cellClass = "px-4 py-3 sm:px-4 sm:py-3 text-sm text-gray-700";

const VendorPage = () => {
  const { setParams } = useHandleParams();
  const isManager = useIsManager();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [officeId, setOfficeId] = useState<string>(ALL);
  const debouncedSearch = useDebounce(search, 300);
  const [deleting, setDeleting] = useState<Vendor | null>(null);

  const { data: officesData } = trpc.officeQuery.getOffices.useQuery({
    searchQuery: "",
    status: "all",
  });
  const offices: OfficeOption[] = officesData?.offices ?? [];

  const queryInput = {
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    status: status === ALL ? undefined : (status as "active" | "inactive"),
    office_id: officeId === ALL ? undefined : Number(officeId),
  };

  // Loaded pages belong to one query input; changing it starts over at page 1.
  const queryKey = JSON.stringify(queryInput);
  const [loadedPages, setLoadedPages] = useState({ queryKey, count: 1 });
  const pageCount = loadedPages.queryKey === queryKey ? loadedPages.count : 1;

  // Every loaded page stays an active query, so invalidating refreshes rows
  // in place instead of appending a page twice.
  const pageQueries: UseQueryResult<VendorsPage>[] = trpc.useQueries((t: any) =>
    Array.from({ length: pageCount }, (_, index) =>
      t.contractorQuery.getVendors({ ...queryInput, page: index + 1 }),
    ),
  );

  const vendors = pageQueries.flatMap((query) => query.data?.vendors ?? []);
  const pagination = pageQueries
    .flatMap((query) => query.data?.pagination ?? [])
    .at(-1);
  const failedQuery = pageQueries.find((query) => query.isError);
  const isInitialLoading = !!pageQueries[0]?.isLoading;
  const isFetchingMore = pageCount > 1 && !!pageQueries.at(-1)?.isLoading;
  const isFiltered = !!queryInput.search || status !== ALL || officeId !== ALL;

  const deleteVendor = trpc.contractorMutation.deleteContractor.useMutation({
    onSuccess: () => {
      toast.success("Vendor deleted");
      utils.contractorQuery.invalidate();
    },
    onError: (error: { message: string }) => toast.error(error.message),
    onSettled: () => setDeleting(null),
  });

  const resetFilters = () => {
    setSearch("");
    setStatus(ALL);
    setOfficeId(ALL);
  };

  const renderList = () => {
    if (isInitialLoading) {
      return (
        <div className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className='h-12 w-full'
            />
          ))}
        </div>
      );
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
              : "Add the contractors your offices give restoration work to."
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
              <TableHead className={headClass}>Office</TableHead>
              <TableHead className={headClass}>Contact</TableHead>
              <TableHead className={headClass}>GST / PAN</TableHead>
              <TableHead className={headClass}>Status</TableHead>
              {isManager && <TableHead className={cn(headClass, "w-12")} />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow
                key={vendor.id}
                className='border-gray-100'>
                <TableCell className={cellClass}>
                  <p className='font-medium text-gray-900'>
                    {capitalFirstLetter(vendor.name)}
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
                  {vendor.office_name
                    ? capitalizeEachWord(vendor.office_name)
                    : "—"}
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
                {isManager && (
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
                          className='text-red-600 focus:text-red-600'
                          onClick={() => setDeleting(vendor)}>
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete vendor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {pagination?.hasMore && (
          <div className='flex justify-center border-t py-3'>
            <LoadMoreBtn
              onClick={() => setLoadedPages({ queryKey, count: pageCount + 1 })}
              loading={isFetchingMore}
            />
          </div>
        )}
        <div className='border-t px-4 py-2 text-xs text-muted-foreground'>
          Showing {vendors.length} of {pagination?.total ?? vendors.length}{" "}
          vendors
        </div>
      </div>
    );
  };

  return (
    <div className='mt-4 space-y-4'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400' />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search by name, contact, email or GST'
            aria-label='Search vendors'
            className='h-9 bg-white pl-9'
          />
        </div>
        <Select
          value={officeId}
          onValueChange={setOfficeId}>
          <SelectTrigger
            aria-label='Filter by office'
            className='h-9 bg-white sm:w-56'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All offices</SelectItem>
            {offices.map((office) => (
              <SelectItem
                key={office.id}
                value={String(office.id)}>
                {capitalizeEachWord(office.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={setStatus}>
          <SelectTrigger
            aria-label='Filter by status'
            className='h-9 bg-white sm:w-36'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value='active'>Active</SelectItem>
            <SelectItem value='inactive'>Inactive</SelectItem>
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            variant='ghost'
            className='h-9 text-xs'
            onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {renderList()}

      <VendorDialog />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Expenses and restorations recorded with this vendor keep their
              amounts but no longer name it. To keep its history, set it to
              inactive instead.
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
