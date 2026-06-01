import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { capitalFirstLetter } from "@pkg/utils";
import SitesSkeleton from "../skeleton/office-site/sites-skeleton";
import Error from "@/components/shared/error";

type Site = {
  id: number;
  name: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  office_id: number;
  status: string;
  created_at: string;
  updated_at: string;
};

interface Props {
  officeId: number;
}

const OfficeSiteTable: React.FC<Props> = ({ officeId }) => {
  const {
    data: sitesData,
    isLoading: sitesLoading,
    isError,
    error,
  } = trpc.siteQuery.get6SitesByOfficeId.useQuery({
    office_id: officeId,
  });

  if (sitesLoading) {
    return <SitesSkeleton />;
  }

  if (isError && error) {
    return (
      <Error
        variant='inline'
        message={error.message}
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
          {sitesData?.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className='text-center py-8 text-muted-foreground'>
                No sites found
              </TableCell>
            </TableRow>
          ) : (
            sitesData &&
            sitesData
              .slice()
              .sort((a: Site, b: Site) => a.id - b.id)
              .map((site: any) => (
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
        </TableBody>
      </Table>
    </div>
  );
};

export default OfficeSiteTable;
