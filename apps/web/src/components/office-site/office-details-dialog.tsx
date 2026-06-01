import React, { useState, useEffect } from "react";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import { trpc } from "@/lib/trpc";
import Loading from "@/components/loading/Loading";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
import {
  Briefcase,
  Building2,
  Mail,
  MapPin,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import SiteWorkOrdersDialog from "./site-work-orders-dialog";

const ITEMS_PER_PAGE = 50;

const OfficeDetailsDialog = () => {
  const { getParam, deleteParams, setParams } = useHandleParams();
  const isOpenDialog = getParam("dialog") === "view-office";
  const officeId = getParam("officeId");
  const officeName = getParam("officeName");

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);

  const { data: officesData } = trpc.officeQuery.getOffices.useQuery(
    {},
    { enabled: isOpenDialog && !!officeId },
  );
  const officeInfo = (officesData as any)?.offices?.find(
    (o: any) => o.id === Number(officeId),
  );

  const { data, isLoading, isFetching } =
    trpc.siteQuery.getSitesByOfficeId.useQuery(
      {
        office_id: Number(officeId),
        searchQuery: debouncedSearchTerm,
        status: "all",
        page,
        limit: ITEMS_PER_PAGE,
      },
      {
        enabled: isOpenDialog && !!officeId,
      },
    );

  // Accumulate sites across pages
  const [allSites, setAllSites] = useState<any[]>([]);

  // Type assertion for the new response structure
  const responseData = data as any;

  // Update accumulated sites when new data arrives
  useEffect(() => {
    if (responseData?.sites && !isFetching) {
      setAllSites((prev) => {
        if (page === 1) {
          return responseData.sites;
        }
        const existingIds = new Set(prev.map((s: any) => s.id));
        const newSites = responseData.sites.filter(
          (s: any) => !existingIds.has(s.id),
        );
        return [...prev, ...newSites];
      });
    }
  }, [responseData?.sites, page, isFetching, debouncedSearchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  // Reset page when dialog closes
  useEffect(() => {
    if (!isOpenDialog) {
      setPage(1);
      setAllSites([]);
    }
  }, [isOpenDialog]);

  const handleDialogClose = () => {
    deleteParams(["dialog", "officeId", "officeName"]);
    setPage(1);
    setSearchTerm("");
    setAllSites([]);
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const hasMore = responseData?.hasMore ?? false;
  const totalCount = responseData?.totalCount ?? 0;

  return (
    <>
      <DialogWindow
      open={isOpenDialog}
      setOpen={handleDialogClose}
      isLoading={false}
      title='Office Sites'
      description={`All sites for ${officeName || "this office"}`}
      size='xl'
      heightMode='full'>
      <div className='space-y-4'>
        {/* Office Info Card */}
        {officeInfo && (
          <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col gap-3'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div className='flex items-center gap-2 min-w-0'>
                <Building2 className='w-4 h-4 text-primary shrink-0 mt-0.5' />
                <span className='text-sm font-semibold text-slate-800 break-words'>
                  {capitalizeEachWord(officeInfo.name)}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  officeInfo.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                {capitalFirstLetter(officeInfo.status)}
              </span>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600'>
              <div className='flex items-start gap-1.5'>
                <MapPin className='w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5' />
                <span>
                  {capitalFirstLetter(officeInfo.address)},{" "}
                  {capitalizeEachWord(officeInfo.city)},{" "}
                  {capitalizeEachWord(officeInfo.state)} – {officeInfo.pincode}
                </span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Mail className='w-3.5 h-3.5 text-slate-400 shrink-0' />
                <span className='truncate'>{officeInfo.email}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Shield className='w-3.5 h-3.5 text-slate-400 shrink-0' />
                <span>GST: {officeInfo.gst_number}</span>
              </div>
              {officeInfo.manager && (
                <div className='flex items-center gap-1.5'>
                  <Users className='w-3.5 h-3.5 text-slate-400 shrink-0' />
                  <span>
                    Manager:{" "}
                    {capitalizeEachWord(officeInfo.manager.name ?? "N/A")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className='relative pt-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <input
            type='text'
            placeholder='Search sites by name, city or address...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50 focus:bg-white'
          />
        </div>

        {/* Summary Card */}
        <div className='flex items-center justify-between px-1'>
          <p className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
            Site Locations
          </p>
          <p className='text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full'>
            {totalCount} total
          </p>
        </div>

        {/* Sites List */}
        {isLoading && page === 1 ? (
          <Loading />
        ) : allSites.length === 0 ? (
          <div className='text-center py-12 text-muted-foreground'>
            No sites found for this office
          </div>
        ) : (
          <>
            <div className='border rounded-lg bg-white overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs h-8'>Status</TableHead>
                    <TableHead className='text-xs h-8'>Name</TableHead>
                    <TableHead className='text-xs h-8'>Address</TableHead>
                    <TableHead className='text-xs h-8'>Pincode</TableHead>
                    <TableHead className='text-xs h-8'>Created</TableHead>
                    <TableHead className='text-xs h-8 text-right'>
                      Work Orders
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className='py-2'>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            site.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                          {capitalFirstLetter(site.status)}
                        </span>
                      </TableCell>
                      <TableCell className='text-xs font-medium py-2'>
                        {capitalizeEachWord(site.name)}
                      </TableCell>
                      <TableCell className='text-xs py-2 max-w-xs'>
                        {capitalFirstLetter(site.address)},{" "}
                        {capitalizeEachWord(site.city)},{" "}
                        {capitalizeEachWord(site.state)}
                      </TableCell>
                      <TableCell className='text-xs font-mono py-2'>
                        {site.pincode}
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground py-2 whitespace-nowrap'>
                        {format(new Date(site.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className='py-2 text-right'>
                        <button
                          type='button'
                          onClick={() =>
                            setParams({
                              siteWoId: String(site.id),
                              siteWoName: site.name,
                            })
                          }
                          className='inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700'>
                          <Briefcase className='h-3.5 w-3.5' />
                          Work orders &amp; operators
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Load More Button */}
            {hasMore && (
              <LoadMoreBtn
                onClick={handleLoadMore}
                loading={isFetching && page > 1}
              />
            )}

            {/* Showing count */}
            <div className='text-center text-sm text-muted-foreground pb-4'>
              Showing {allSites.length} of {totalCount} sites
            </div>
          </>
        )}
      </div>
      </DialogWindow>
      <SiteWorkOrdersDialog />
    </>
  );
};

export default OfficeDetailsDialog;
