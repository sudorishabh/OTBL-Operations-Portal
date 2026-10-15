"use client";
import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { FlaskConical, LayoutGrid, List, Plus } from "lucide-react";
import toast from "react-hot-toast";
import useHandleParams from "@/hooks/useHandleParams";
import CustomButton from "@/components/shared/btn";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import Error from "@/components/shared/error";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WorkOrderSitesSkeleton from "@/components/skeleton/work-order/work-order-sites-skeleton";
import ProcessSectionHeader, { PROCESS_TONES } from "../process-section-header";
import CreateWorkOrderSiteDialog from "../create-wo-site/create-wo-site-dialog";
import SiteDetailDialog from "../site-details-dialog/site-details-dialog";
import SitesTable from "./wo-sites-table";
import WOSitesCard from "./wo-sites-card";

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
  const { setParam, setParams } = useHandleParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sitesList, setSitesList] = useState<any[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

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

  const handleSiteDetails = (siteId: string) => {
    setParams({
      dialog: "site-details",
      "wo-site-id": siteId,
    });
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

  return (
    <section
      className={cn(
        "rounded-lg border border-l-[3px] bg-white p-6",
        PROCESS_TONES.bioremediation.section,
      )}>
      <ProcessSectionHeader
        Icon={FlaskConical}
        tone='bioremediation'
        title='Bioremediation'
        description={`Done at sites, ${siteCount} ${siteCount === 1 ? "site" : "sites"} added so far.`}>
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
      </ProcessSectionHeader>

      {sitesList.length > 0 ? (
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
          {!isFetchingMore && pagination?.hasMore && (
            <div className='flex justify-center mt-4'>
              <LoadMoreBtn
                onClick={() => setCurrentPage((prev) => prev + 1)}
                loading={false}
              />
            </div>
          )}
          <div className='flex justify-between items-center px-4 py-2 text-xs text-muted-foreground border-t mt-4'>
            <span>
              Showing {sitesList.length} of{" "}
              {pagination?.total || sitesList.length} sites
            </span>
            {pagination && pagination.totalPages > 1 && (
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className='text-center text-xs py-8 text-gray-500'>
          No sites added yet. Click &quot;Create Site&quot; to get started.
        </div>
      )}

      <CreateWorkOrderSiteDialog
        workOrder={workOrder}
        scheduleOfRates={scheduleOfRates}
      />
      <SiteDetailDialog />
    </section>
  );
};

export default BioremediationSection;
