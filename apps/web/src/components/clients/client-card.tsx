import React from "react";
import { MapPin, Calendar, PhoneIcon } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { capitalFirstLetter } from "@pkg/utils";
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
  work_order_number?: string | number;
  proposal_number?: string | number;
  sites_work_done?: number;
}

interface ClientCardProps {
  client: Client;
  contactsCount: number;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, contactsCount }) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/dashboard/client/${client.id}`);
  };

  const locationParts = [client.city, client.state]
    .filter(Boolean)
    .map((v) => capitalFirstLetter(v!))
    .join(", ");

  const isActive = client.status === "active";

  return (
    <div
      className='bg-white rounded-xl cursor-pointer border border-gray-200 shadow-sm hover:shadow-md overflow-hidden group'
      onClick={handleCardClick}>
      <div className='flex flex-col px-5 py-5'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6'>
          {/* Client name / date / status */}
          <div className='w-full sm:w-72 sm:shrink-0'>
            <h3 className='text-base font-bold text-gray-800 line-clamp-1'>
              {capitalFirstLetter(client.name)}
            </h3>
            <div className='flex items-center gap-1.5 text-xs text-gray-400 mt-1'>
              <Calendar className='h-3 w-3' />
              <span>
                {client.created_at
                  ? format(new Date(client.created_at), "MMM dd, yyyy")
                  : "-"}
              </span>
            </div>
            <div className='mt-2.5 flex items-center gap-2.5'>
              {client.status && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-400"}`}
                  />
                  {capitalFirstLetter(client.status)}
                </span>
              )}
              <span className='text-[10px] text-gray-400'>
                {contactsCount} {contactsCount === 1 ? "Contact" : "Contacts"}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className='hidden sm:block h-16 w-px bg-gray-100 shrink-0' />

          {/* Location & Contact */}
          <div className='flex-1 grid grid-cols-2 gap-4 sm:gap-6'>
            {/* Location */}
            <div>
              <div className='flex items-center gap-1.5 mb-2'>
                <MapPin className='h-3.5 w-3.5 text-emerald-500' />
                <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wider'>
                  Location
                </span>
              </div>
              <p
                className='text-sm text-gray-700 line-clamp-1 leading-snug'
                title={client.address}>
                {client.address || "-"}
              </p>
              <p className='text-xs text-gray-400 mt-0.5'>
                {locationParts || "-"}
                {client.pincode ? ` - ${client.pincode}` : ""}
              </p>
            </div>

            {/* Contact */}
            <div>
              <div className='flex items-center gap-1.5 mb-2'>
                <PhoneIcon className='h-3.5 w-3.5 text-emerald-500' />
                <span className='text-[10px] font-semibold text-gray-400 uppercase tracking-wider'>
                  Contact
                </span>
              </div>
              <a
                href={`tel:${client.contact_number}`}
                onClick={(e) => e.stopPropagation()}
                className='block text-sm text-gray-700 font-medium leading-snug'>
                {client.contact_number || "-"}
              </a>
              <a
                href={`mailto:${client.email}`}
                onClick={(e) => e.stopPropagation()}
                className='block text-xs text-gray-400 truncate mt-0.5'
                title={client.email}>
                {client.email || "-"}
              </a>
            </div>
          </div>

          {/* Arrow */}
          <div className='hidden sm:block shrink-0'>
            <Btn
              variant='arrow'
              arrowType='right'
              className='border-0 group-hover:bg-emerald-600'
            />
          </div>
        </div>

        {/* Bottom Stats */}
        <div className='mt-4 pt-4 border-t border-gray-100'>
          <div className='grid grid-cols-3 gap-2'>
            <div className='px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100'>
              <div className='text-[10px] text-gray-400 uppercase tracking-wide mb-0.5'>
                Work Order
              </div>
              <div
                className='font-semibold text-sm text-gray-700 truncate'
                title={String(client.work_order_number ?? "-")}>
                {client.work_order_number ?? "-"}
              </div>
            </div>

            <div className='px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100'>
              <div className='text-[10px] text-gray-400 uppercase tracking-wide mb-0.5'>
                Proposal
              </div>
              <div
                className='font-semibold text-sm text-gray-700 truncate'
                title={String(client.proposal_number ?? "-")}>
                {client.proposal_number ?? "-"}
              </div>
            </div>

            <div className='px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100'>
              <div className='text-[10px] text-gray-400 uppercase tracking-wide mb-0.5'>
                Sites Done
              </div>
              <div className='font-semibold text-sm text-gray-700'>
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
