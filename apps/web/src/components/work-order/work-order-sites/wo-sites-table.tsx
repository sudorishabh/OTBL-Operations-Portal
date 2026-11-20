import React from "react";
import { format } from "date-fns";
import { ChevronRight, FileText } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { cn } from "@/lib/utils";
import { formatDateRange, scheduleNote } from "@/lib/wo-site-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LIST_CELL,
  LIST_FRAME,
  LIST_HEAD,
  LIST_HEAD_ROW,
  LIST_LINK,
  LIST_ROW,
  LIST_SUBTEXT,
  ListPill,
  type PillTone,
} from "@/components/shared/list-table";

interface Site {
  id: number;
  wo_site_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status: "pending" | "completed" | "cancelled";
  // Unset for a site added before its dates are known.
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  users: { user_id: number; user_name: string }[];
  measurement_sheets?: { id: number; document_url: string }[];
}

interface Props {
  sites: Site[];
  onSiteClick: (siteId: string) => void;
}

// Named and coloured as on the site cards.
const STATUSES: Record<Site["status"], { label: string; tone: PillTone }> = {
  pending: { label: "Pending", tone: "yellow" },
  completed: { label: "Complete", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};

// Operators shown by name before the rest are counted.
const MAX_VISIBLE_OPERATORS = 2;

const addedOn = (value: string) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : format(date, "d MMM yyyy");
};

// A work order's sites in the portal's list table look: each site, where it
// is, its dates, its operators, its measurement sheets and its status. The
// whole row opens the site.
const WOSitesTable = ({ sites, onSiteClick }: Props) => (
  <div className={LIST_FRAME}>
    <div className='overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow className={LIST_HEAD_ROW}>
            <TableHead className={LIST_HEAD}>Site</TableHead>
            <TableHead className={LIST_HEAD}>Location</TableHead>
            <TableHead className={LIST_HEAD}>Dates</TableHead>
            <TableHead className={LIST_HEAD}>Operators</TableHead>
            <TableHead className={LIST_HEAD}>Measurement sheets</TableHead>
            <TableHead className={LIST_HEAD}>Status</TableHead>
            <TableHead className={cn(LIST_HEAD, "w-10")}>
              <span className='sr-only'>Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.length === 0 ? (
            <TableRow className={cn(LIST_ROW, "hover:bg-transparent")}>
              <TableCell
                colSpan={7}
                className={cn(LIST_CELL, "py-8 text-center text-gray-500")}>
                No sites found.
              </TableCell>
            </TableRow>
          ) : (
            sites.map((site) => {
              const name = capitalFirstLetter(site.name);
              const status = STATUSES[site.status] ?? STATUSES.pending;
              const note = scheduleNote(
                site.status,
                site.start_date,
                site.end_date,
              );
              const location = [site.city, site.state]
                .filter(Boolean)
                .join(", ");
              const fullAddress = [site.address, site.city, site.state]
                .filter(Boolean)
                .join(", ");
              const operators = (site.users ?? []).map((user) =>
                capitalFirstLetter(user.user_name),
              );
              const hiddenOperators = operators.slice(MAX_VISIBLE_OPERATORS);
              const sheets = site.measurement_sheets?.length ?? 0;
              const added = addedOn(site.created_at);

              return (
                <TableRow
                  key={site.wo_site_id}
                  onClick={() => onSiteClick(site.wo_site_id)}
                  className={cn(LIST_ROW, "group cursor-pointer")}>
                  <TableCell className={LIST_CELL}>
                    <button
                      type='button'
                      onClick={(event) => {
                        event.stopPropagation();
                        onSiteClick(site.wo_site_id);
                      }}
                      title={`Open ${name}`}
                      className={cn(
                        "cursor-pointer text-left font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                        LIST_LINK,
                      )}>
                      {name}
                    </button>
                    {added && <p className={LIST_SUBTEXT}>Added {added}</p>}
                  </TableCell>
                  <TableCell className={LIST_CELL}>
                    <span
                      className='block max-w-[14rem] truncate'
                      title={fullAddress || undefined}>
                      {location || <span className='text-gray-400'>—</span>}
                    </span>
                  </TableCell>
                  <TableCell className={cn(LIST_CELL, "whitespace-nowrap")}>
                    {formatDateRange(site.start_date, site.end_date)}
                    {note && (
                      <p className={cn("text-xs", note.tone)}>{note.text}</p>
                    )}
                  </TableCell>
                  <TableCell className={LIST_CELL}>
                    {operators.length === 0 ? (
                      <span className='text-gray-400'>None assigned</span>
                    ) : (
                      <div className='flex flex-wrap gap-1'>
                        {operators
                          .slice(0, MAX_VISIBLE_OPERATORS)
                          .map((operator, index) => (
                            <ListPill
                              key={`${operator}-${index}`}
                              tone='orange'
                              square>
                              {operator}
                            </ListPill>
                          ))}
                        {hiddenOperators.length > 0 && (
                          <span title={hiddenOperators.join(", ")}>
                            <ListPill square>
                              +{hiddenOperators.length}
                            </ListPill>
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={cn(LIST_CELL, "whitespace-nowrap")}>
                    {sheets > 0 ? (
                      <span className='inline-flex items-center gap-1.5'>
                        <FileText className='size-3.5 text-gray-400' />
                        {sheets} {sheets === 1 ? "sheet" : "sheets"}
                      </span>
                    ) : (
                      <span className='text-gray-400'>—</span>
                    )}
                  </TableCell>
                  <TableCell className={LIST_CELL}>
                    <ListPill tone={status.tone}>{status.label}</ListPill>
                  </TableCell>
                  <TableCell className={cn(LIST_CELL, "text-right")}>
                    <ChevronRight className='ml-auto size-4 text-gray-300 transition-colors group-hover:text-emerald-600' />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

export default WOSitesTable;
