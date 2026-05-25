import React from "react";
import { MapPin, Calendar, PhoneIcon, MailIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { capitalFirstLetter } from "@pkg/utils";
import { Badge } from "@/components/ui/badge";
import Btn from "@/components/shared/btn";

interface ClientContact {
  id: number | string;
  client_id: number;
  name: string;
  contact_number?: string;
  email?: string;
}

interface Client {
  id: number | string;
  name: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gst_number?: string;
  contact_number?: string;
  email?: string;
  status?: string;
  created_at?: string | Date;
  // optional work-related fields
  work_order_number?: string | number;
  proposal_number?: string | number;
  sites_work_done?: number;
}

interface ClientCardProps {
  client: Client;
  contactsCount: number;
  //   onEdit?: (client: Client, contacts: ClientContact[]) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  contactsCount,
  //   onEdit,
}) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/dashboard/client/${client.id}`);
  };

  return (
    <div
      className='bg-white rounded-xl cursor-pointer border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-20 transition-all duration-300 overflow-hidden group relative'
      onClick={handleCardClick}>
      <div className='flex flex-col gap-4 px-5 py-6'>
        <div className='flex items-center gap-6'>
          <div className='shrink-0 w-80'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex-1 min-w-0'>
                <h3 className='text-lg font-bold text-gray-700 group-hover:text-emerald-700 transition-colors line-clamp-1 mb-1'>
                  {capitalFirstLetter(client.name)}
                </h3>
                <div className='flex items-center gap-1.5 text-xs text-gray-500'>
                  <Calendar className='h-3.5 w-3.5' />
                  <span>
                    {client.created_at
                      ? format(new Date(client.created_at), "MMM dd, yyyy")
                      : "-"}
                  </span>
                </div>
                <div className='mt-2 flex items-center gap-2'>
                  {client.status && (
                    <Badge
                      variant={
                        client.status === "active" ? "secondary" : "outline"
                      }
                      className='text-xs bg-gray-100 text-gray-600 '>
                      {capitalFirstLetter(client.status || "N/A")}
                    </Badge>
                  )}
                  <div className='text-xs text-gray-500 flex items-center gap-1'>
                    <span className='w-1.5 h-1.5 rounded-full bg-gray-400' />
                    {contactsCount}{" "}
                    {contactsCount === 1 ? "Contact" : "Contacts"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className='h-24 w-px bg-gray-200 shrink-0' />

          {/* Middle Section: Location & Contact */}
          <div className='flex-1 grid grid-cols-2 gap-6'>
            {/* Location */}
            <div className='space-y-2'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='p-1.5 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors'>
                  <MapPin className='h-4 w-4 text-emerald-600' />
                </div>
                <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                  Location
                </span>
              </div>
              <div className='space-y-1 pl-0.5'>
                <p
                  className='text-sm text-gray-700 line-clamp-1'
                  title={client.address}>
                  {client.address || "-"}
                </p>
                <p className='text-xs text-gray-600'>
                  {capitalFirstLetter(client.city || "-")},{" "}
                  {capitalFirstLetter(client.state || "-")} - {client.pincode}
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className='space-y-2'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='p-1.5 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors'>
                  <PhoneIcon className='h-4 w-4 text-emerald-600' />
                </div>
                <span className='text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                  Contact
                </span>
              </div>
              <div className='space-y-1.5 pl-0.5'>
                <a
                  href={`tel:${client.contact_number}`}
                  onClick={(e) => e.stopPropagation()}
                  className='flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-700 transition-colors font-medium'>
                  <PhoneIcon className='h-3.5 w-3.5' />
                  {client.contact_number || "-"}
                </a>
                <a
                  href={`mailto:${client.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className='flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-700 transition-colors truncate'
                  title={client.email}>
                  <MailIcon className='h-3.5 w-3.5' />
                  {client.email || "-"}
                </a>
              </div>
            </div>
          </div>

          <div className='shrink-0'>
            <Btn
              variant='arrow'
              arrowType='right'
              className='group-hover:bg-emerald-600 border-0 transition-all duration-300 group-hover:scale-110'
            />
          </div>
        </div>

        {/* Bottom Section: Work Info */}
        <div className='pt-4 border-t border-gray-100'>
          <div className='grid grid-cols-3 gap-2'>
            <div className='bg-linear-to-br from-gray-50 to-gray-100 px-3 py-3 rounded-lg border border-gray-200 group-hover:border-emerald-200 transition-colors'>
              <div className='text-[10px] text-gray-500 uppercase tracking-wide mb-0.5'>
                Work Order
              </div>
              <div
                className='font-semibold text-sm text-gray-800 truncate'
                title={String(client.work_order_number ?? "-")}>
                {client.work_order_number ?? "-"}
              </div>
            </div>

            <div className='bg-linear-to-br from-gray-50 to-gray-100 px-3 py-3 rounded-lg border border-gray-200 group-hover:border-emerald-200 transition-colors'>
              <div className='text-[10px] text-gray-500 uppercase tracking-wide mb-0.5'>
                Proposal
              </div>
              <div
                className='font-semibold text-sm text-gray-800 truncate'
                title={String(client.proposal_number ?? "-")}>
                {client.proposal_number ?? "-"}
              </div>
            </div>

            <div className='bg-linear-to-br from-emerald-50 to-teal-50 px-3 py-3 rounded-lg border border-emerald-200 group-hover:border-emerald-300 transition-colors'>
              <div className='text-[10px] text-emerald-700 uppercase tracking-wide mb-0.5'>
                Sites Done
              </div>
              <div className='font-bold text-sm text-emerald-700'>
                {client.sites_work_done ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientCard;
