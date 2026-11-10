"use client";
import { Building2 } from "lucide-react";
import NoFetchData from "@/components/shared/no-fetch-data";
import PaginationSummary from "@/components/shared/pagination-summary";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import { useDebounce } from "@/hooks/useDebounce";
import { useOfficeManagementContext } from "@/contexts/OfficeManagementContext";
import type { UseQueryResult } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Error from "@/components/shared/error";
import OfficeSiteFilter from "./office-site-filter";
import OfficeSiteSkeleton, {
  OfficeCardLoading,
} from "../skeleton/office-site/office-site-skeleton";
import ScrollToTop from "@/components/scroll-to-top";

const CreateOfficeDialog = dynamic(() => import("./create-office-dialog"));
const EditOfficeDialog = dynamic(() => import("./edit-office-dialog"));
const CreateSiteDialog = dynamic(() => import("./create-site-dialog"));
const OfficeDetailsDialog = dynamic(() => import("./office-details-dialog"));
const ManageOfficeMembersDialog = dynamic(
  () => import("./manage-office-members-dialog"),
);
const OfficeCard = dynamic(() => import("./office-card"), {
  loading: () => <OfficeCardLoading />,
});

const OFFICES_PAGE_SIZE = 10;

type OfficesPage = RouterOutputs["officeQuery"]["getOffices"];

const OfficeSitePage = () => {
  const { filters, searchQuery, officeNamesOrder } =
    useOfficeManagementContext();
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);

  const queryInput = {
    limit: OFFICES_PAGE_SIZE,
    status: filters.status,
    state: filters.state === "all" ? undefined : filters.state,
    searchQuery: debouncedSearch || undefined,
    officeNamesOrder,
  };

  const { pages, loadMore } = useLoadMorePages(queryInput);

  const pageQueries: UseQueryResult<OfficesPage>[] = trpc.useQueries((t: any) =>
    pages.map((page) => t.officeQuery.getOffices({ ...queryInput, page })),
  );

  const offices = pageQueries.flatMap((query) => query.data?.offices ?? []);
  const pagination = pageQueries
    .flatMap((query) => query.data?.pagination ?? [])
    .at(-1);
  const failedQuery = pageQueries.find((query) => query.isError);

  const isOfficesQueryLoading = !!pageQueries[0]?.isLoading;
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;
  const isOffice = offices.length > 0;

  const hasActiveFilters =
    !!debouncedSearch || filters.status !== "all" || filters.state !== "all";

  return (
    <>
      <div className='w-full mt-8'>
        <OfficeSiteFilter />

        <Suspense fallback={<OfficeSiteSkeleton />}>
          {isOfficesQueryLoading ? (
            <OfficeSiteSkeleton />
          ) : failedQuery?.error ? (
            <Error
              variant='default'
              message={failedQuery.error.message}
            />
          ) : !isOffice ? (
            <NoFetchData
              Icon={Building2}
              title={hasActiveFilters ? "No Results Found" : "No Offices Found"}
              description={
                hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Add offices to manage them"
              }
            />
          ) : (
            <div>
              <div className='grid grid-cols-1 sm:grid-cols-1 gap-4'>
                {offices.map((office: any) => (
                  <OfficeCard
                    key={office.id}
                    office={office}
                    siteStatus={filters.siteStatus}
                  />
                ))}
              </div>

              {pagination?.hasMore && (
                <LoadMoreBtn
                  onClick={loadMore}
                  loading={isFetchingMore}
                />
              )}

              <PaginationSummary
                shown={offices.length}
                total={pagination?.total}
                page={pagination?.page}
                totalPages={pagination?.totalPages}
                noun='offices'
                className='mt-4 rounded-lg border bg-white'
              />
            </div>
          )}
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <CreateOfficeDialog />
        <EditOfficeDialog />
        <CreateSiteDialog />
        <OfficeDetailsDialog />
        <ManageOfficeMembersDialog />
      </Suspense>
      <ScrollToTop />
    </>
  );
};

export default OfficeSitePage;
