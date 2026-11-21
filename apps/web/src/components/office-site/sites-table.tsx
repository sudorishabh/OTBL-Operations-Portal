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

// A site's ⋯ menu: its work orders and operators, and editing it.
const SiteActions = ({
  site,
  officeId,
  officeName,
  canEditSites,
}: {
  site: OfficeSite;
  officeId: number;
  officeName: string;
  canEditSites: boolean;
}) => {
  const { setParams } = useHandleParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='h-8 w-8 p-0 pointer-coarse:size-10'>
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
  );
};

// An office's sites, each with its work orders and edit options. Phones get
// a card per site; the table needs a tablet's width.
export const SitesTable = ({
  sites,
  officeId,
  officeName,
  canEditSites,
  emptyMessage,
  footer,
  className,
}: SitesTableProps) => {
  const actionsFor = (site: OfficeSite) => (
    <SiteActions
      site={site}
      officeId={officeId}
      officeName={officeName}
      canEditSites={canEditSites}
    />
  );

  return (
    <div className={cn("border rounded-lg bg-gray-100/60", className)}>
      <ul className='divide-y md:hidden'>
        {sites.length === 0 ? (
          <li className='py-8 text-center text-sm text-muted-foreground'>
            {emptyMessage}
          </li>
        ) : (
          sites.map((site) => (
            <li
              key={site.id}
              className='flex items-start gap-2 px-4 py-3'>
              <div className='min-w-0 flex-1 space-y-1 text-xs'>
                <div className='flex min-w-0 items-center gap-2'>
                  <RecordCode code={site.code} />
                  <span className='truncate text-sm font-medium text-gray-900'>
                    {capitalFirstLetter(site.name)}
                  </span>
                </div>
                <p className='text-gray-600'>{site.address}</p>
                <p className='text-muted-foreground'>
                  <span className='font-medium text-gray-700'>{site.city}</span>{" "}
                  {site.state}
                  {site.pincode && ` · ${site.pincode}`}
                </p>
                <p className='text-muted-foreground'>
                  Added {new Date(site.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className='-mr-2 -mt-1'>{actionsFor(site)}</div>
            </li>
          ))
        )}
      </ul>

      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow>
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
                  colSpan={5}
                  className='text-center py-8 text-muted-foreground'>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sites.map((site) => (
                <TableRow
                  key={site.id}
                  className='hover:bg-gray-50'>
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
                    {actionsFor(site)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {footer}
    </div>
  );
};
