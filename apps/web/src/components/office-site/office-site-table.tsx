import React from "react";
import { ClipboardList, MoreHorizontal, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { capitalFirstLetter } from "@pkg/utils";
import type { UseQueryResult } from "@tanstack/react-query";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import PaginationSummary from "@/components/shared/pagination-summary";
import { OfficeSitesTableSkeleton } from "../skeleton/office-site/office-site-skeleton";
import Error from "@/components/shared/error";

const SITES_PAGE_SIZE = 6;

type SitesPage = RouterOutputs["siteQuery"]["getSitesByOfficeId"];

interface Props {
  officeId: number;
  officeName: string;
  /** Which of the office's sites to list. */
  status?: "active" | "inactive" | "all";
  /** The office's manager or an admin, who may edit its sites. */
  canManage?: boolean;
}

const OfficeSiteTable: React.FC<Props> = ({
  officeId,
  officeName,
  status = "all",
  canManage = false,
}) => {
  const { setParams } = useHandleParams();

  const queryInput = {
    office_id: officeId,
    status,
    limit: SITES_PAGE_SIZE,
  };

  const { pages, loadMore } = useLoadMorePages(queryInput);

  const pageQueries: UseQueryResult<SitesPage>[] = trpc.useQueries((t: any) =>
    pages.map((page) =>
      t.siteQuery.getSitesByOfficeId({ ...queryInput, page }),
    ),
  );

  const sites = pageQueries.flatMap((query) => query.data?.sites ?? []);
  const loadedPages = pageQueries.flatMap((query) => query.data ?? []);
  const lastLoadedPage = loadedPages.at(-1);
  const failedQuery = pageQueries.find((query) => query.isError);

  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;

  if (pageQueries[0]?.isLoading) {
    return <OfficeSitesTableSkeleton />;
  }

  if (failedQuery?.error) {
    return (
      <Error
        variant='inline'
        message={failedQuery.error.message}
      />
    );
  }

  return (
    <div className='border rounded-lg bg-gray-100/60 '>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-xs'>Status</TableHead>
            <TableHead className='pl-4 text-xs'>Name</TableHead>
            <TableHead className='text-xs'>Address</TableHead>
            <TableHead className='text-xs'>Pincode</TableHead>
            <TableHead className='text-xs'>Created</TableHead>
            <TableHead className='pr-4 text-right text-xs'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className='text-center py-8 text-muted-foreground'>
                {status === "all" ? "No sites found" : `No ${status} sites`}
              </TableCell>
            </TableRow>
          ) : (
            sites.map((site) => (
              <TableRow
                key={site.id}
                className='hover:bg-gray-50'>
                <TableCell className='pl-6'>
                  {site.status === "active" ? (
                    <div className='text-green-500 h-3 w-3 rounded-full bg-green-500'></div>
                  ) : (
                    <div className='text-red-500 h-3 w-3 rounded-full bg-red-500'></div>
                  )}
                </TableCell>
                <TableCell className='text-xs font-medium pl-4'>
                  {capitalFirstLetter(site.name)}
                </TableCell>
                <TableCell className='text-xs max-w-xs truncate'>
                  <div>{site.address}</div>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>{site.city}</span>
                    <span className='text-muted-foreground text-xs'>
                      {site.state}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='text-xs font-mono'>
                  {site.pincode}
                </TableCell>

                <TableCell className='text-xs text-muted-foreground'>
                  {new Date(site.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className='pr-4 text-right'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        className='h-8 w-8 p-0'>
                        <span className='sr-only'>Actions for {site.name}</span>
                        <MoreHorizontal className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onClick={() =>
                          setParams({
                            siteWoId: String(site.id),
                            siteWoName: site.name,
                          })
                        }>
                        <ClipboardList className='mr-2 h-4 w-4' />
                        Work orders and operators
                      </DropdownMenuItem>
                      {canManage && (
                        <DropdownMenuItem
                          onClick={() =>
                            setParams({
                              dialog: "update-site",
                              siteId: String(site.id),
                              officeId: String(officeId),
                              officeName,
                            })
                          }>
                          <Pencil className='mr-2 h-4 w-4' />
                          Edit site
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}

          {lastLoadedPage?.hasMore && (
            <TableRow>
              <TableCell
                colSpan={6}
                className='text-center'>
                <LoadMoreBtn
                  onClick={loadMore}
                  loading={isFetchingMore}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {sites.length > 0 && (
        <PaginationSummary
          shown={sites.length}
          total={lastLoadedPage?.totalCount}
          page={loadedPages.length}
          totalPages={Math.ceil(
            (lastLoadedPage?.totalCount ?? 0) / SITES_PAGE_SIZE,
          )}
          noun='sites'
          className='border-t'
        />
      )}
    </div>
  );
};

export default OfficeSiteTable;
