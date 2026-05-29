import React, { useState, useEffect } from "react";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import { trpc } from "@/lib/trpc";
import Loading from "@/components/loading/Loading";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
import StatusIndicator from "@/components/shared/status-indicator";
import { Building2, Mail, MapPin, Search, Shield, UserMinus, Users } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import SiteOperatorsSection from "./site-operators-section";
import toast from "react-hot-toast";
import { useApiError } from "@/hooks/useApiError";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 50;

const OfficeDetailsDialog = () => {
  const { getParam, deleteParams } = useHandleParams();
  const isOpenDialog = getParam("dialog") === "view-office";
  const officeId = getParam("officeId");
  const officeName = getParam("officeName");

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);

  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const removeFromSite = trpc.siteMutation.removeUserFromSite.useMutation({
    onSuccess: async () => {
      toast.success("Operator removed from site");
      await utils.siteQuery.getSitesByOfficeId.invalidate();
      await utils.siteQuery.get6SitesByOfficeId.invalidate();
    },
    onError: (e: unknown) => handleError(e, { showToast: true }),
  });

  const { data: officesData } = trpc.officeQuery.getOffices.useQuery(
    {},
    { enabled: isOpenDialog && !!officeId },
  );
  const officeInfo = (officesData as any)?.offices?.find(
    (o: any) => o.id === Number(officeId),
  );
  // Only an admin or this office's manager may add/remove site operators.
  const canManageMembers = !!officeInfo?.canManage;

  const { data, isLoading, isFetching } =
    trpc.siteQuery.getSitesByOfficeId.useQuery(
      {
        office_id: Number(officeId),
        searchQuery: debouncedSearchTerm,
        status: "all",
        page,
        limit: ITEMS_PER_PAGE,
        siteUsersLimit: 80,
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
            <div className='grid gap-4'>
              {allSites.map((site) => (
                <Card
                  key={site.id}
                  className='py-4 gap-4 rounded-sm'>
                  <CardHeader className='px-3 sm:px-4 gap-0'>
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                      <div className='min-w-0'>
                        <CardTitle className='text-base flex flex-wrap items-center gap-2'>
                          <span className='break-words'>
                            {capitalizeEachWord(site.name)}
                          </span>
                          {site.status === "active" ? (
                            <span className='bg-green-100 text-green-800 px-2 rounded-full text-xs shrink-0'>
                              Active
                            </span>
                          ) : (
                            <span className='bg-red-100 text-red-800 px-2 rounded-full text-xs shrink-0'>
                              Inactive
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className='text-xs break-words'>
                          {capitalFirstLetter(site.address)},{" "}
                          {capitalizeEachWord(site.city)},{" "}
                          {capitalizeEachWord(site.state)} - {site.pincode}
                        </CardDescription>
                      </div>
                      <div className='flex items-center gap-2 shrink-0'>
                        <div className='text-xs text-muted-foreground'>
                          {format(new Date(site.created_at), "dd MMM yyyy")}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className='px-3 sm:px-4'>
                    {site.users && site.users.length > 0 ? (
                      <>
                        {/* Mobile: stacked user cards */}
                        <div className='sm:hidden space-y-2'>
                          {site.users.map((user: any, idx: number) => (
                            <div
                              key={`m-${site.id}-${user.user_id ?? user.email}-${idx}`}
                              className='flex items-start justify-between gap-2 rounded-md border bg-white p-2.5'>
                              <div className='min-w-0 flex-1 space-y-0.5'>
                                <div className='flex items-center gap-2 min-w-0'>
                                  <StatusIndicator
                                    status={
                                      user.status ? "active" : "inactive"
                                    }
                                    size='sm'
                                  />
                                  <span className='text-xs font-medium truncate'>
                                    {capitalizeEachWord(user.name || "N/A")}
                                  </span>
                                  <span className='text-[10px] text-muted-foreground shrink-0'>
                                    · {capitalizeEachWord(user.role || "N/A")}
                                  </span>
                                </div>
                                <p className='text-[11px] text-muted-foreground truncate'>
                                  {user.email || "N/A"}
                                </p>
                                {user.contact_number && (
                                  <p className='text-[11px] text-muted-foreground'>
                                    {user.contact_number}
                                  </p>
                                )}
                              </div>
                              {canManageMembers &&
                                typeof user.user_id === "number" && (
                                  <button
                                    type='button'
                                    disabled={removeFromSite.isPending}
                                    onClick={() =>
                                      removeFromSite.mutate({
                                        site_id: site.id,
                                        user_id: user.user_id,
                                      })
                                    }
                                    className='shrink-0 inline-flex rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50'
                                    aria-label={`Remove ${user.name || "operator"} from site`}>
                                    <UserMinus className='h-4 w-4' />
                                  </button>
                                )}
                            </div>
                          ))}
                        </div>

                        {/* sm and up: table */}
                        <div className='hidden sm:block border rounded-lg bg-white overflow-x-auto'>
                          <Table className='bg-gray-100/50'>
                            <TableHeader>
                              <TableRow>
                                <TableHead className='text-xs h-8'>
                                  Name
                                </TableHead>
                                <TableHead className='text-xs h-8'>
                                  Role
                                </TableHead>
                                <TableHead className='text-xs h-8'>
                                  Email
                                </TableHead>
                                <TableHead className='text-xs h-8'>
                                  Contact
                                </TableHead>
                                <TableHead className='text-xs h-8 text-right w-[72px]'>
                                  Remove
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {site.users.map((user: any, idx: number) => (
                                <TableRow
                                  key={`${site.id}-${user.user_id ?? user.email}-${idx}`}>
                                  <TableCell className='text-xs py-2'>
                                    <div className='flex items-center gap-2'>
                                      <StatusIndicator
                                        status={
                                          user.status ? "active" : "inactive"
                                        }
                                        size='sm'
                                      />
                                      {capitalizeEachWord(user.name || "N/A")}
                                    </div>
                                  </TableCell>
                                  <TableCell className='text-xs py-2'>
                                    {capitalizeEachWord(user.role || "N/A")}
                                  </TableCell>
                                  <TableCell className='text-xs py-2'>
                                    {user.email || "N/A"}
                                  </TableCell>
                                  <TableCell className='text-xs py-2'>
                                    {user.contact_number || "N/A"}
                                  </TableCell>
                                  <TableCell className='text-xs py-2 text-right'>
                                    {canManageMembers &&
                                    typeof user.user_id === "number" ? (
                                      <button
                                        type='button'
                                        disabled={removeFromSite.isPending}
                                        onClick={() =>
                                          removeFromSite.mutate({
                                            site_id: site.id,
                                            user_id: user.user_id,
                                          })
                                        }
                                        className='inline-flex rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50'
                                        aria-label={`Remove ${user.name || "operator"} from site`}>
                                        <UserMinus className='h-4 w-4' />
                                      </button>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <span className='inline-block text-xs text-gray-500 py-1 bg-red-50 rounded px-2'>
                        No operators assigned to this site yet.
                      </span>
                    )}
                    {canManageMembers && (
                      <SiteOperatorsSection
                        officeId={Number(officeId)}
                        siteId={site.id}
                        siteUsers={site.users ?? []}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
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
  );
};

export default OfficeDetailsDialog;
