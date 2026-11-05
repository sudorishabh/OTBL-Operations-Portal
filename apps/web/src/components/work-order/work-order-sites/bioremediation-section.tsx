"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
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
import WorkOrderSitesSkeleton from "@/components/skeleton/work-order/work-order-sites-skeleton";
import ProcessSectionHeader from "../process-section-header";
import CreateWorkOrderSiteDialog from "../create-wo-site/create-wo-site-dialog";
import SitesTable from "./wo-sites-table";
import WOSitesCard from "./wo-sites-card";
import ContractOrdersSection from "../contract-orders/contract-orders-section";

interface Props {
  workOrder: any;
  scheduleOfRates: any[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const SITES_QUERY_LIMIT = 12;

type SectionTab = "sites" | "orders";

const normalizeSiteStatus = (
  input: unknown,
): "pending" | "completed" | "cancelled" => {
  const v = String(input ?? "")
    .trim()
    .toLowerCase();
  if (v === "completed") return "completed";
  if (v === "cancelled" || v === "canceled") return "cancelled";
  return "pending";
};

// Bioremediation is done at sites, so this section lists and adds them.
const BioremediationSection = ({ workOrder, scheduleOfRates }: Props) => {
  const { setParam } = useHandleParams();
  const router = useRouter();
  const pathname = usePathname();
  const [currentPage, setCurrentPage] = useState(1);
  const [sitesList, setSitesList] = useState<any[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [tab, setTab] = useState<SectionTab>("sites");

  const isWorkOrderCompleted = workOrder.status === "completed";

  const {
    data: sitesData,
    isLoading: isSitesQueryLoading,
    dataUpdatedAt: sitesDataUpdatedAt,
    isError: isSitesQueryError,
    error: sitesQueryError,
  } = trpc.workOrderQuery.getWorkOrderSites.useQuery({
    id: workOrder.id,
    page: currentPage,
    limit: SITES_QUERY_LIMIT,
  });

  const { sites: fetchedSites, pagination: fetchedPagination } = sitesData || {
    sites: [],
    pagination: {
      page: 1,
      limit: SITES_QUERY_LIMIT,
      total: 0,
      totalPages: 1,
      hasMore: false,
    },
  };

  const isFetchingMore = isSitesQueryLoading && currentPage > 1;

  useEffect(() => {
    if (
      !isSitesQueryLoading &&
      fetchedSites &&
      fetchedPagination?.page === currentPage
    ) {
      const mappedSites = fetchedSites.map((s: any) => ({
        id: s.site_id,
        wo_site_id: s.id,
        name: s.site_name,
        address: s.site_address,
        city: s.site_city,
        state: s.site_state,
        pincode: s.site_pincode,
        start_date:
          s.start_date && !isNaN(new Date(s.start_date).getTime())
            ? new Date(s.start_date).toISOString()
            : new Date().toISOString(),
        end_date:
          s.end_date && !isNaN(new Date(s.end_date).getTime())
            ? new Date(s.end_date).toISOString()
            : new Date().toISOString(),
        status:
          s.is_completed === true ? "completed" : normalizeSiteStatus(s.status),
        client_id: workOrder.client_id,
        work_order_id: workOrder.id,
        activity_type: s.activity_type,
        metric_ton: s.metric_ton,
        metric_ton_rate: s.metric_ton_rate,
        budget_amount: s.budget_amount,
        total_completion_amount: s.total_completion_amount,
        created_at: s.created_at,
        users: s.users,
        measurement_sheets: s.measurement_sheets,
      }));

      if (currentPage === 1) {
        setSitesList(mappedSites);
      } else {
        setSitesList((prev) => [...prev, ...mappedSites]);
      }
      setPagination(fetchedPagination);
    }
  }, [sitesDataUpdatedAt, currentPage]);

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

  if (isSitesQueryLoading && currentPage === 1) {
    return <WorkOrderSitesSkeleton />;
  }

  if (isSitesQueryError) {
    return (
      <Error
        variant='inline'
        message={sitesQueryError.message || "Failed to load sites"}
      />
    );
  }

  const siteCount = pagination?.total || 0;

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
        {isFetchingMore && <WorkOrderSitesSkeleton />}
        {/* Only while more sites are left to load. */}
        {!isFetchingMore && pagination?.hasMore && (
          <div className='mt-4 flex flex-col items-center gap-2'>
            <LoadMoreBtn
              onClick={() => setCurrentPage((prev) => prev + 1)}
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
        No sites yet. Create one to estimate and treat its contaminated soil.
      </p>
    );

  return (
    <section className='rounded-lg border bg-white p-6'>
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
                  disabled={sitesList.length === 0}
                  className='gap-2 px-3 text-xs text-gray-800'>
                  <ShoppingCart className='size-3.5 text-gray-500' />
                  Purchase orders and sub-contracts
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
