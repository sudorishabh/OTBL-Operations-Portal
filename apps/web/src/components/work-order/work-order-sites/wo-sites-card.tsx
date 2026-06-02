import React from "react";
import { capitalFirstLetter } from "@pkg/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  FileText,
  ExternalLink,
} from "lucide-react";
import Btn from "@/components/shared/btn";
interface Site {
  id: number;
  wo_site_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status: "pending" | "completed" | "cancelled";
  start_date: string;
  end_date: string;
  created_at: string;
  users: { user_id: number; user_name: string }[];
  measurement_sheets?: { id: number; document_url: string }[];
}

interface Props {
  sites: Site[];
  handleSiteDetails: (siteId: string) => void;
}

const WOSitesCard = ({ sites, handleSiteDetails }: Props) => {
  if (!sites || sites.length === 0) {
    return (
      <div className='text-center py-10 text-gray-500'>
        No sites found matching your criteria.
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
      {sites.map((site) => (
        <div
          key={site.wo_site_id + site.created_at}
          onClick={() => {
            handleSiteDetails(site.wo_site_id);
          }}
          className='group relative border rounded-xl p-4 hover:shadow-sm transition-all  duration-300 cursor-pointer hover:border-green-400 bg-gray-100/50 flex flex-col justify-start overflow-hidden'>
          <div className='flex items-start justify-between mb-4'>
            <div className='space-y-1'>
              <h3 className='font-semibold text-sm text-gray-600 group-hover:text-emerald-700 transition-colors line-clamp-1'>
                {capitalFirstLetter(site.name)}
              </h3>
              <div className='flex items-center gap-1.5 text-xs text-gray-400 font-medium'>
                <Clock className='w-3 h-3' />
                <span>
                  {format(new Date(site.created_at), "MMM dd, yyyy • hh:mm a")}
                </span>
              </div>
            </div>
            <Btn
              text='View'
              arrowType='upright'
              variant='arrow'
              className='group-hover:text-white group-hover:bg-emerald-600 transition-colors'
            />
          </div>

          <div className='space-y-2 text-sm text-gray-600 mb-5'>
            <div className='flex items-start rounded-lg bg-gray-50/50 group-hover:bg-blue-50/30 transition-colors'>
              <p className='text-xs line-clamp-2 leading-relaxed'>
                {site.address}, {site.city}, {site.state}
              </p>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200/70'>
                <div className='flex flex-col'>
                  <span className='text-[10px] text-gray-400 uppercase font-semibold'>
                    Start
                  </span>
                  <span className='font-medium text-xs text-gray-700'>
                    {format(site.start_date, "dd/MM/yy")}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200/70'>
                <div className='flex flex-col'>
                  <span className='text-[10px] text-gray-400 uppercase font-semibold'>
                    End
                  </span>
                  <span className='font-medium text-xs text-gray-700'>
                    {format(site.end_date, "dd/MM/yy")}
                  </span>
                </div>
              </div>
            </div>

            <div className='pt-2'>
              <div className='flex items-center gap-2 mb-2'>
                <Users className='w-4 h-4 text-purple-500' />
                <span className='text-xs font-semibold text-gray-500 uppercase tracking-tight'>
                  On-site Operators
                </span>
              </div>
              <div className='flex items-center gap-1.5 flex-wrap'>
                {site?.users?.length > 0 ? (
                  site.users.map(
                    (user: { user_id: number; user_name: string }) => (
                      <Badge
                        key={user.user_id}
                        className='bg-white border text-gray-700 font-medium text-[10px] px-2 py-0 hover:bg-gray-100 transition-colors'>
                        {capitalFirstLetter(user.user_name)}
                      </Badge>
                    ),
                  )
                ) : (
                  <span className='text-[11px] text-gray-400 italic'>
                    No operators assigned
                  </span>
                )}
              </div>
            </div>

            {site.measurement_sheets && site.measurement_sheets.length > 0 && (
              <div className='pt-2 border-t border-gray-100/50 mt-2'>
                <div className='flex items-center gap-2 mb-2'>
                  <FileText className='w-4 h-4 text-emerald-500' />
                  <span className='text-xs font-semibold text-gray-500 uppercase tracking-tight'>
                    Measurement Sheets ({site.measurement_sheets.length})
                  </span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {site.measurement_sheets.slice(0, 3).map((sheet, idx) => (
                    <a
                      key={sheet.id}
                      href={sheet.document_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      onClick={(e) => e.stopPropagation()}
                      className='flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-medium border border-emerald-100 hover:bg-emerald-100 transition-colors'>
                      <ExternalLink className='w-2.5 h-2.5' />
                      Sheet {idx + 1}
                    </a>
                  ))}
                  {site.measurement_sheets.length > 3 && (
                    <span className='text-[10px] text-gray-400 font-medium py-1 px-1'>
                      +{site.measurement_sheets.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WOSitesCard;
