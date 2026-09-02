"use client";
import { Building2, Search, X } from "lucide-react";
import NoFetchData from "@/components/shared/no-fetch-data";
import { trpc } from "@/lib/trpc";
import { useOfficeManagementContext } from "@/contexts/OfficeManagementContext";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Error from "@/components/shared/error";
import OfficeSiteFilter from "./office-site-filter";
import OfficeSiteSkeleton from "../skeleton/office-site/office-site-skeleton";
import ScrollToTop from "@/components/scroll-to-top";

const CreateOfficeDialog = dynamic(() => import("./create-office-dialog"));
const CreateSiteDialog = dynamic(() => import("./create-site-dialog"));
const OfficeDetailsDialog = dynamic(() => import("./office-details-dialog"));
const ManageOfficeMembersDialog = dynamic(
  () => import("./manage-office-members-dialog"),
);
const OfficeCard = dynamic(() => import("./office-card"));

const OfficeSitePage = () => {
  const { setSearchQuery, filters, setFilters, searchQuery, resetFilters } =
    useOfficeManagementContext();

  const {
    data: officesQuery,
    isLoading: isOfficesQueryLoading,
    isError,
    error,
  } = trpc.officeQuery.getOffices.useQuery({
    status: filters.status,
    searchQuery: searchQuery,
  });
  const isOffice = (officesQuery?.offices?.length ?? 0) > 0;
  const offices = officesQuery?.offices ?? [];

  const hasActiveFilters = searchQuery !== "" || filters.status !== "all";

  return (
    <>
      <div className='w-full mt-8'>
        <OfficeSiteFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
          isOfficesQueryLoading={isOfficesQueryLoading}
          hasActiveFilters={hasActiveFilters}
        />

        <Suspense fallback={<OfficeSiteSkeleton />}>
          {isOfficesQueryLoading ? (
            <OfficeSiteSkeleton />
          ) : isError && error ? (
            <Error
              variant='default'
              message={error.message}
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
            <div className='space-y-6'>
              <div className='grid grid-cols-1 sm:grid-cols-1 gap-4'>
                {offices.map((office: any) => (
                  <OfficeCard
                    key={office.id}
                    office={office}
                  />
                ))}
              </div>
            </div>
          )}
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <CreateOfficeDialog />
        <CreateSiteDialog />
        <OfficeDetailsDialog />
        <ManageOfficeMembersDialog />
      </Suspense>
      <ScrollToTop />
    </>
  );
};

export default OfficeSitePage;
