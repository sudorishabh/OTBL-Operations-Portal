"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import { FilterBar, SearchFilter } from "@/components/filters/list-filters";
import {
  FlaskConical,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  ShoppingCart,
} from "lucide-react";
import toast from "react-hot-toast";
import useHandleParams from "@/hooks/useHandleParams";
import CustomButton from "@/components/shared/btn";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import Error from "@/components/shared/error";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BioremediationSectionSkeleton, {
  SiteCardsSkeleton,
} from "@/components/skeleton/work-order/work-order-sites-skeleton";
import ProcessSectionHeader from "../process-section-header";
import CreateWorkOrderSiteDialog from "../create-wo-site/create-wo-site-dialog";
import SitesTable from "./wo-sites-table";
import WOSitesCard from "./wo-sites-card";
import ContractOrdersSection from "../contract-orders/contract-orders-section";
import { toDate } from "@/lib/wo-site-display";

interface Props {
  workOrder: any;
  scheduleOfRates: any[];
}

type SitesPage = RouterOutputs["workOrderQuery"]["getWorkOrderSites"];

const SITES_QUERY_LIMIT = 12;

type SectionTab = "sites" | "orders";

const normalizeSiteStatus = (
  input: unknown,
): "pending" | "completed" => {
  const v = String(input ?? "")
    .trim()
    .toLowerCase();
  if (v === "completed") return "completed";
  return "pending";
};

// Bioremediation is done at sites, so this section lists and adds them.
const BioremediationSection = ({ workOrder, scheduleOfRates }: Props) => {
  const { setParam } = useHandleParams();
  const router = useRouter();
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [tab, setTab] = useState<SectionTab>("sites");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);

  const isWorkOrderCompleted = workOrder.status === "completed";

  const queryInput = {
    id: workOrder.id,
    limit: SITES_QUERY_LIMIT,
    search: debouncedSearch || undefined,
  };
  const { pages, loadMore } = useLoadMorePages(queryInput);

  // Each page is its own query, so adding or editing a site refreshes the
  // loaded pages in place. A new search keeps the last sites in view until
  // its first page arrives.
  const pageQueries: UseQueryResult<SitesPage>[] = trpc.useQueries((t: any) =>
    pages.map((page) =>
      t.workOrderQuery.getWorkOrderSites(
        { ...queryInput, page },
        { placeholderData: page === 1 ? keepPreviousData : undefined },
      ),
    ),
  );

  const firstPage = pageQueries[0]?.data;
  const pagination = pageQueries.at(-1)?.data?.pagination ?? null;
  const failedQuery = pageQueries.find((query) => query.isError);
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;
  const sitesList = pageQueries.flatMap((query) =>
    (query.data?.sites ?? []).map((s: any) => ({
      id: s.site_id,
      wo_site_id: s.id,
      name: s.site_name,
      address: s.site_address,
      city: s.site_city,
      state: s.site_state,
      pincode: s.site_pincode,
      // A site can be added before its dates are known.
      start_date: toDate(s.start_date)?.toISOString() ?? null,
      end_date: toDate(s.end_date)?.toISOString() ?? null,
      status:
        s.is_completed === true ? "completed" : normalizeSiteStatus(s.status),
      client_id: workOrder.client_id,
      work_order_id: workOrder.id,
      created_at: s.created_at,
      users: s.users,
      measurement_sheets: s.measurement_sheets,
    })),
  );
  // Every site of the work order, whatever the search.
  const siteCount = firstPage?.total_sites ?? 0;

  const handleCreateSiteDialog = () => {
    if (isWorkOrderCompleted) {
      toast.error("Work order is completed. You can't add more sites.");
      return;
    }
    setParam("dialog", "create-wo-site");
  };

  // Each site has its own page, under whichever work order page this is.
  const handleSiteDetails = (siteId: string) => {
    router.push(`${pathname}/sites/${siteId}`);
  };

  if (pageQueries[0]?.isLoading) {
    return <BioremediationSectionSkeleton />;
  }

  if (failedQuery?.error) {
    return (
      <Error
        variant='inline'
        message={failedQuery.error.message || "Failed to load sites"}
      />
    );
  }

  const siteActions = (
    <>
      <Tabs
        value={viewMode}
        onValueChange={(val) => setViewMode(val as "card" | "table")}>
        <TabsList className='grid w-36 grid-cols-2 h-8'>
          <TabsTrigger
            value='card'
            className='gap-2 text-xs text-gray-800'>
            <LayoutGrid className='size-3.5 text-gray-500' />
            Card
          </TabsTrigger>
          <TabsTrigger
            value='table'
            className='gap-2 text-xs text-gray-800'>
            <List className='size-3.5 text-gray-500' />
            Table
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {scheduleOfRates.length > 0 && (
        <CustomButton
          variant='primary'
          Icon={Plus}
          text='Create Site'
          onClick={handleCreateSiteDialog}
          disabled={isWorkOrderCompleted}
          disableForViewer
        />
      )}
    </>
  );

  const searchBar = siteCount > 0 && (
    <FilterBar className='mb-3'>
      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder='Search code, name, address or city…'
        label='Search sites'
      />
      {debouncedSearch && pagination && (
        <p className='col-span-2 text-xs text-gray-500 sm:ml-auto'>
          {pagination.total} of {siteCount} sites
        </p>
      )}
    </FilterBar>
  );

  const sitesContent =
    sitesList.length > 0 ? (
      <div className='relative'>
        <Tabs
          value={viewMode}
          className='w-full'>
          <TabsContent value='card'>
            <WOSitesCard
              sites={sitesList}
              handleSiteDetails={handleSiteDetails}
            />
          </TabsContent>
          <TabsContent value='table'>
            <SitesTable
              sites={sitesList}
              onSiteClick={handleSiteDetails}
            />
          </TabsContent>
        </Tabs>
        {isFetchingMore && <SiteCardsSkeleton />}
        {/* Only while more sites are left to load. */}
        {!isFetchingMore && pagination?.hasMore && (
          <div className='mt-4 flex flex-col items-center gap-2'>
            <LoadMoreBtn
              onClick={loadMore}
              loading={false}
            />
            <span className='text-xs text-gray-500'>
              Showing {sitesList.length} of {pagination.total} sites
            </span>
          </div>
        )}
      </div>
    ) : (
      <p className='rounded-lg border border-dashed py-8 text-center text-xs text-gray-500'>
        {debouncedSearch
          ? "No sites match this search."
          : "No sites yet. Create one to estimate and treat its contaminated soil."}
      </p>
    );

  return (
    <section className='rounded-lg border bg-white p-4 sm:p-6'>
      <ProcessSectionHeader
        Icon={FlaskConical}
        tone='bioremediation'
        title='Bioremediation'
        description='Done site by site, through purchase orders and sub-contracts'
      />

      {/* The sites, and the orders giving out their work, a tab each with
          its own actions beside the tabs. */}
      <ContractOrdersSection workOrderId={workOrder.id}>
        {({ actions: orderActions, table: ordersTable, count: orderCount }) => (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as SectionTab)}>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <TabsList className='h-8'>
                <TabsTrigger
                  value='sites'
                  className='gap-2 px-3 text-xs text-gray-800'>
                  <MapPin className='size-3.5 text-gray-500' />
                  Sites
                  <span className='tabular-nums text-gray-400'>
                    {siteCount}
                  </span>
                </TabsTrigger>
                {/* Orders list what each site needs, so wait for a site. */}
                <TabsTrigger
                  value='orders'
                  disabled={siteCount === 0}
                  className='gap-2 px-3 text-xs text-gray-800'>
                  <ShoppingCart className='size-3.5 text-gray-500' />
                  <span className='sm:hidden'>Orders</span>
                  <span className='hidden sm:inline'>
                    Purchase orders and sub-contracts
                  </span>
                  <span className='tabular-nums text-gray-400'>
                    {orderCount}
                  </span>
                </TabsTrigger>
              </TabsList>
              <div className='flex flex-wrap items-center gap-2'>
                {tab === "sites" ? siteActions : orderActions}
              </div>
            </div>
            <TabsContent
              value='sites'
              className='mt-4'>
              {searchBar}
              {sitesContent}
            </TabsContent>
            <TabsContent
              value='orders'
              className='mt-4'>
              {ordersTable}
            </TabsContent>
          </Tabs>
        )}
      </ContractOrdersSection>

      <CreateWorkOrderSiteDialog
        workOrder={workOrder}
        scheduleOfRates={scheduleOfRates}
      />
    </section>
  );
};

export default BioremediationSection;
