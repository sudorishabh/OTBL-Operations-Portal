"use client";
import { Suspense, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { keepPreviousData } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import NoFetchData from "@/components/shared/no-fetch-data";
import TablePagination, {
  scrollIntoViewIfAbove,
} from "@/components/shared/table-pagination";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageNumber } from "@/hooks/usePageNumber";
import { useOfficeManagementContext } from "@/contexts/OfficeManagementContext";
import Error from "@/components/shared/error";
import ScrollToTop from "@/components/scroll-to-top";
import OfficeSiteFilter from "./office-site-filter";
import OfficeCard from "./office-card";
import OfficeSiteSkeleton from "../skeleton/office-site/office-site-skeleton";

const CreateOfficeDialog = dynamic(() => import("./create-office-dialog"));
const EditOfficeDialog = dynamic(() => import("./edit-office-dialog"));
const CreateSiteDialog = dynamic(() => import("./create-site-dialog"));
const ManageOfficeMembersDialog = dynamic(
  () => import("./manage-office-members-dialog"),
);

const OFFICES_PAGE_SIZE = 10;

type OfficesPage = RouterOutputs["officeQuery"]["getOffices"];

const OfficeSitePage = () => {
  const { filters, searchQuery, officeNamesOrder } =
    useOfficeManagementContext();
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);
  const listRef = useRef<HTMLDivElement>(null);

  const filterInput = {
    status: filters.status,
    state: filters.state === "all" ? undefined : filters.state,
    searchQuery: debouncedSearch || undefined,
    officeNamesOrder,
  };
  const [page, setPage] = usePageNumber(filterInput);

  // The cards on screen stay while another page or filter loads.
  const { data, isLoading, isPlaceholderData, error } =
    trpc.officeQuery.getOffices.useQuery(
      { ...filterInput, page, limit: OFFICES_PAGE_SIZE },
      { placeholderData: keepPreviousData },
    );
  const result = data as OfficesPage | undefined;
  const offices = result?.offices ?? [];
  const total = result?.pagination.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / OFFICES_PAGE_SIZE));

  // Back to the last page when this one no longer exists.
  useEffect(() => {
    if (result && !isPlaceholderData && page > lastPage) setPage(lastPage);
  }, [result, isPlaceholderData, page, lastPage, setPage]);

  const goToPage = (next: number) => {
    setPage(next);
    scrollIntoViewIfAbove(listRef.current);
  };

  const hasActiveFilters =
    !!debouncedSearch || filters.status !== "all" || filters.state !== "all";

  const renderList = () => {
    if (isLoading) return <OfficeSiteSkeleton />;

    if (!result) {
      return (
        <Error
          variant='default'
          message={error?.message ?? "The offices could not be loaded."}
        />
      );
    }

    if (offices.length === 0) {
      return (
        <NoFetchData
          Icon={Building2}
          title={hasActiveFilters ? "No Results Found" : "No Offices Found"}
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Add offices to manage them"
          }
        />
      );
    }

    return (
      <>
        <div
          className={cn(
            "grid grid-cols-1 gap-4 transition-opacity",
            isPlaceholderData && "pointer-events-none opacity-60",
          )}>
          {offices.map((office) => (
            <OfficeCard
              key={office.id}
              office={office}
            />
          ))}
        </div>

        <TablePagination
          page={page}
          pageSize={OFFICES_PAGE_SIZE}
          total={total}
          noun={total === 1 ? "office" : "offices"}
          onPageChange={goToPage}
          className='mt-4 rounded-lg border bg-white'
        />
      </>
    );
  };

  return (
    <>
      <div
        ref={listRef}
        className='mt-8 w-full scroll-mt-4'>
        <OfficeSiteFilter />
        {renderList()}
      </div>

      <Suspense fallback={null}>
        <CreateOfficeDialog />
        <EditOfficeDialog />
        <CreateSiteDialog />
        <ManageOfficeMembersDialog />
      </Suspense>
      <ScrollToTop />
    </>
  );
};

export default OfficeSitePage;
