import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc, type RouterOutputs } from "@/lib/trpc";
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
}

const OfficeSiteTable: React.FC<Props> = ({ officeId }) => {
  const queryInput = {
    office_id: officeId,
    status: "all",
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className='text-center py-8 text-muted-foreground'>
                No sites found
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
                <TableCell className='pr-4 text-right'></TableCell>
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
