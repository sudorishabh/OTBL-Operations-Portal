import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MapPin, Calendar, ArrowRight, Clock, FileText } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { formatDateRange } from "@/lib/wo-site-display";

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

const WOSitesTable = ({ sites, onSiteClick }: Props) => {
  if (!sites || sites.length === 0) {
    return (
      <div className='text-center py-10 text-gray-500'>
        No sites found matching your criteria.
      </div>
    );
  }

  return (
    <div className='rounded-md border border-gray-100 overflow-hidden'>
      <Table>
        <TableHeader>
          <TableRow className='bg-gray-50/50 hover:bg-gray-50/50'>
            <TableHead className='font-semibold text-gray-700'>
              Site Name
            </TableHead>
            <TableHead className='font-semibold text-gray-700'>
              Location
            </TableHead>
            <TableHead className='font-semibold text-gray-700'>
              Timeline
            </TableHead>
            <TableHead className='font-semibold text-gray-700'>
              Operators
            </TableHead>
            <TableHead className='font-semibold text-gray-700'>
              Status
            </TableHead>
            <TableHead className='font-semibold text-gray-700'>Docs</TableHead>
            <TableHead className='font-semibold text-gray-700 text-right'>
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.map((site) => (
            <TableRow
              key={site.wo_site_id}
              className='hover:bg-blue-50/30 transition-colors cursor-pointer'
              onClick={() => onSiteClick(site.wo_site_id)}>
              <TableCell className='py-4'>
                <div className='flex flex-col'>
                  <span className='font-semibold text-gray-900'>
                    {capitalFirstLetter(site.name)}
                  </span>
                  <div className='flex items-center gap-1.5 text-[10px] text-gray-400 mt-1'>
                    <Clock className='w-3 h-3' />
                    <span>
                      {format(new Date(site.created_at), "MMM dd, yyyy")}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className='flex items-start gap-2 max-w-[200px]'>
                  <MapPin className='w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5' />
                  <span className='text-sm text-gray-600 line-clamp-1'>
                    {site.city}, {site.state}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center gap-1.5 text-xs text-gray-600'>
                    <Calendar className='w-3 h-3 text-orange-500' />
                    <span>
                      {formatDateRange(site.start_date, site.end_date)}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className='flex -space-x-2 overflow-hidden'>
                  {site.users?.length > 0 ? (
                    <div className='flex flex-wrap gap-1'>
                      {site.users.slice(0, 2).map((user) => (
                        <Badge
                          key={user.user_id}
                          variant='outline'
                          className='text-[10px] py-0 px-1.5 bg-white'>
                          {capitalFirstLetter(user.user_name.split(" ")[0] || "")}
                        </Badge>
                      ))}
                      {site.users.length > 2 && (
                        <Badge
                          variant='outline'
                          className='text-[10px] py-0 px-1.5 bg-gray-50'>
                          +{site.users.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className='text-[11px] text-gray-400 italic'>
                      Unassigned
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    site.status === "completed"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : site.status === "cancelled"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  } hover:${
                    site.status === "completed"
                      ? "bg-green-50"
                      : site.status === "cancelled"
                        ? "bg-red-50"
                        : "bg-yellow-50"
                  }`}>
                  {site.status}
                </Badge>
              </TableCell>
              <TableCell>
                {site.measurement_sheets &&
                site.measurement_sheets.length > 0 ? (
                  <div className='flex items-center gap-1.5 text-emerald-600 font-medium'>
                    <FileText className='w-3.5 h-3.5' />
                    <span className='text-xs'>
                      {site.measurement_sheets.length}
                    </span>
                  </div>
                ) : (
                  <span className='text-xs text-gray-400'>-</span>
                )}
              </TableCell>
              <TableCell className='text-right'>
                <div className='flex justify-end'>
                  <div className='p-2 rounded-full hover:bg-blue-100/50 text-emerald-700 transition-colors'>
                    <ArrowRight className='w-4 h-4' />
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WOSitesTable;
