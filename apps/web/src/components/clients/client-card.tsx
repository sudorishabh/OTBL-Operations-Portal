import React from "react";
import { MapPin, PhoneIcon } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { capitalFirstLetter } from "@pkg/utils";
import { cn } from "@/lib/utils";
import Btn from "@/components/shared/btn";

interface Client {
  id: number | string;
  name: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gst_number?: string;
  contact_number?: string | null;
  email?: string | null;
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

// Two-letter monogram, used as the visual anchor for each row.
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

const Empty = () => <span className='text-gray-300'>&mdash;</span>;

const Field = ({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon?: React.ElementType;
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={cn("min-w-0", className)}>
    <div className='flex h-3.5 items-center gap-1.5'>
      {Icon && <Icon className='h-3 w-3 shrink-0 text-emerald-500' />}
      <span className='text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
        {label}
      </span>
    </div>
    <div className='mt-1.5 min-w-0'>{children}</div>
  </div>
);

const ClientCard: React.FC<ClientCardProps> = ({ client, contactsCount }) => {
  const router = useRouter();

  const openClient = () => router.push(`/dashboard/client/${client.id}`);

  const locationParts = [client.city, client.state]
    .filter(Boolean)
    .map((v) => capitalFirstLetter(v!))
    .join(", ");

  const isActive = client.status === "active";

  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={`Open client ${client.name}`}
      onClick={openClient}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openClient();
        }
      }}
      className='group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm outline-none transition-all duration-200 hover:border-gray-300 hover:shadow-md focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
      <div className='px-5 py-4'>
        {/* Identity */}
        <div className='flex items-start gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[13px] font-bold tracking-tight text-emerald-700 ring-1 ring-inset ring-emerald-100 transition-colors duration-200 group-hover:bg-emerald-100'>
            {getInitials(client.name)}
          </div>

          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1'>
              <h3
                className='line-clamp-1 text-[15px] font-semibold tracking-tight text-gray-900'
                title={client.name}>
                {client.name.toUpperCase()}
              </h3>
              {client.status && (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500",
                  )}>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isActive ? "bg-emerald-500" : "bg-gray-400",
                    )}
                  />
                  {capitalFirstLetter(client.status)}
                </span>
              )}
            </div>

            <p className='mt-0.5 text-xs text-gray-400'>
              {contactsCount} {contactsCount === 1 ? "contact" : "contacts"}
              {client.created_at && (
                <>
                  <span className='mx-1.5 text-gray-300'>&middot;</span>
                  Added {format(new Date(client.created_at), "MMM dd, yyyy")}
                </>
              )}
            </p>
          </div>

          <div className='shrink-0 transition-transform duration-200 group-hover:translate-x-0.5'>
            <Btn
              variant='arrow'
              arrowType='right'
              className='border-0 group-hover:bg-emerald-600'
            />
          </div>
        </div>

        {/* Details: one aligned label row spanning the full card width */}
        <div className='mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-200 pt-4 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)]'>
          <Field
            icon={MapPin}
            label='Location'
            className='col-span-2 sm:col-span-1'>
            {client.address || locationParts ? (
              <>
                <p
                  className='line-clamp-1 text-sm leading-snug text-gray-700'
                  title={client.address}>
                  {client.address || locationParts}
                </p>
                <p className='mt-0.5 truncate text-xs text-gray-400'>
                  {client.address ? locationParts : ""}
                  {client.pincode ? ` - ${client.pincode}` : ""}
                </p>
              </>
            ) : (
              <p className='text-sm leading-snug'>
                <Empty />
              </p>
            )}
          </Field>

          <Field
            icon={PhoneIcon}
            label='Contact'
            className='col-span-2 sm:col-span-1'>
            {client.contact_number ? (
              <a
                href={`tel:${client.contact_number}`}
                onClick={(e) => e.stopPropagation()}
                className='block text-sm font-medium leading-snug text-gray-700 hover:text-emerald-700'>
                {client.contact_number}
              </a>
            ) : (
              <p className='text-sm leading-snug'>
                <Empty />
              </p>
            )}
            {client.email ? (
              <a
                href={`mailto:${client.email}`}
                onClick={(e) => e.stopPropagation()}
                title={client.email}
                className='mt-0.5 block truncate text-xs text-gray-400 hover:text-emerald-700'>
                {client.email}
              </a>
            ) : (
              <p className='mt-0.5 text-xs'>
                <Empty />
              </p>
            )}
          </Field>

          <Field label='Work Order'>
            <p
              className='truncate text-sm font-medium tabular-nums text-gray-700'
              title={
                client.work_order_number
                  ? String(client.work_order_number)
                  : undefined
              }>
              {client.work_order_number ?? <Empty />}
            </p>
          </Field>

          <Field label='Proposal'>
            <p
              className='truncate text-sm font-medium tabular-nums text-gray-700'
              title={
                client.proposal_number
                  ? String(client.proposal_number)
                  : undefined
              }>
              {client.proposal_number ?? <Empty />}
            </p>
          </Field>

          <Field label='Sites Done'>
            <p className='text-sm font-semibold tabular-nums text-gray-700'>
              {client.sites_work_done ?? 0}
            </p>
          </Field>
        </div>
      </div>
    </div>
  );
};

export default ClientCard;
