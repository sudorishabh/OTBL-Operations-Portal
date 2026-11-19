import React from "react";
import RecordCode from "@/components/shared/record-code";
import { ClipboardList, MoreHorizontal, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RouterOutputs } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { capitalFirstLetter } from "@pkg/utils";
import { cn } from "@/lib/utils";

export type OfficeSite =
  RouterOutputs["siteQuery"]["getSitesByOfficeId"]["sites"][number];

interface SitesTableProps {
  sites: OfficeSite[];
  officeId: number;
  officeName: string;
  /** One of the office's operators or an admin, who may edit its sites. */
  canEditSites: boolean;
  /** Shown in place of the rows when there are none. */
  emptyMessage: string;
  /** Under the table, such as a count or page controls. */
  footer?: React.ReactNode;
  className?: string;
}

// An office's sites, each with its work orders and edit options.
export const SitesTable = ({
  sites,
  officeId,
  officeName,
  canEditSites,
  emptyMessage,
  footer,
  className,
}: SitesTableProps) => {
  const { setParams } = useHandleParams();

  return (
    <div className={cn("border rounded-lg bg-gray-100/60", className)}>
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
                {emptyMessage}
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
                  <div className='flex items-center gap-2'>
                    <RecordCode code={site.code} />
                    <span className='truncate'>
                      {capitalFirstLetter(site.name)}
                    </span>
                  </div>
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
                      {canEditSites && (
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
        </TableBody>
      </Table>

      {footer}
    </div>
  );
};
