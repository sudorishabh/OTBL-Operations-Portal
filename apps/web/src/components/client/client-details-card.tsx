import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Building2,
  CalendarDays,
  Eye,
  EyeOff,
  MapPin,
  Network,
  Users,
} from "lucide-react";
import { capitalFirstLetter, formatCurrency } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import Error from "@/components/shared/error";
import { Field, Metric, Pill } from "@/components/shared/detail-card-parts";
import useHandleParams from "@/hooks/useHandleParams";
import ClientInfoSkeleton from "../skeleton/client/client-info-skeleton";
import ContactDialog from "./contact-dialog";

interface Props {
  clientId: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-amber-50 text-amber-700 ring-amber-200",
};

const formatDate = (value?: string | Date | null) => {
  const date = value ? new Date(value) : null;
  return date && !isNaN(date.getTime()) ? format(date, "dd MMM yyyy") : null;
};

// Shows the first and last three characters until revealed.
const maskGst = (gst: string) =>
  gst.length <= 6 ? gst : `${gst.slice(0, 3)}...${gst.slice(-3)}`;

const ClientDetailsCard = ({ clientId }: Props) => {
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [showFullGst, setShowFullGst] = useState(false);
  const { setParam } = useHandleParams();

  const {
    data: clientData,
    isLoading,
    isError,
  } = trpc.clientQuery.getClient.useQuery(
    { clientId: Number(clientId) },
    { enabled: !!clientId },
  );

  // The page title reads the client's name from the URL.
  useEffect(() => {
    if (clientData?.client) {
      setParam("name", clientData.client.name);
    }
  }, [clientData?.client, setParam]);

  if (isLoading) return <ClientInfoSkeleton />;

  if (isError) {
    return (
      <Error
        variant='inline'
        message='Problem fetching Client Details, Please try again later'
      />
    );
  }

  if (!clientData?.client) {
    return (
      <Error
        variant='inline'
        message='Client details not found'
      />
    );
  }

  const { client, clientUsers } = clientData;
  const status = (client.status || "").toLowerCase();
  const location = [client.city, client.state]
    .filter(Boolean)
    .map((part) => capitalFirstLetter(part))
    .join(", ");
  const address = [
    client.address,
    [location, client.pincode].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(", ");
  const addedOn = formatDate(client.created_at);

  const budget = Number(clientData.totalBudgetAmount) || 0;
  // Bioremediation completion amounts, as the work order page counts them.
  const activitySpend = Number(clientData.totalExpenseAmount) || 0;
  const spendPct = budget > 0 ? (activitySpend / budget) * 100 : 0;

  return (
    <>
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
        {/* Identity */}
        <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5'>
          <div className='flex min-w-0 items-center gap-3'>
            <div className='shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100'>
              <Building2 className='size-4' />
            </div>
            <div className='min-w-0'>
              <h2
                className='truncate text-base font-semibold text-gray-900'
                title={client.name}>
                {client.name.toUpperCase()}
              </h2>
              <div className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500'>
                {client.parent_client_name && (
                  <span className='inline-flex min-w-0 items-center gap-1.5'>
                    <Network className='size-3.5 shrink-0 text-gray-400' />
                    <span className='truncate'>
                      Branch of{" "}
                      <span className='font-medium text-gray-700'>
                        {client.parent_client_name.toUpperCase()}
                      </span>
                    </span>
                  </span>
                )}
                {location && (
                  <span className='inline-flex min-w-0 items-center gap-1.5'>
                    <MapPin className='size-3.5 shrink-0 text-gray-400' />
                    <span className='truncate'>{location}</span>
                  </span>
                )}
                {addedOn && (
                  <span className='inline-flex items-center gap-1.5'>
                    <CalendarDays className='size-3.5 shrink-0 text-gray-400' />
                    Added {addedOn}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-1.5'>
            <Pill
              className={
                STATUS_STYLES[status] ??
                "bg-gray-50 text-gray-700 ring-gray-200"
              }>
              {capitalFirstLetter(client.status)}
            </Pill>
            <button
              type='button'
              onClick={() => setIsContactsOpen(true)}
              title='View client contacts'
              className='inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
              <Users className='size-3' />
              {clientUsers.length === 1
                ? "1 contact"
                : `${clientUsers.length} contacts`}
            </button>
          </div>
        </div>

        {/* Metrics, split by hairlines that hold in every column count. */}
        <div className='grid grid-cols-2 gap-px border-y border-gray-200 bg-gray-200 lg:grid-cols-4 [&>*]:bg-gray-50'>
          <Metric
            label='Sites'
            value={Number(clientData.siteCount ?? 0).toLocaleString("en-IN")}
            hint='across work orders'
          />
          <Metric
            label='Work orders'
            value={Number(clientData.completedWorkOrders ?? 0).toLocaleString(
              "en-IN",
            )}
            hint='completed'
          />
          <Metric
            label='Budget'
            value={formatCurrency(budget)}
            hint='schedule of rates total'
          />
          <Metric
            label='Activity spend'
            value={formatCurrency(activitySpend)}
            hint={`${spendPct.toFixed(1)}% of budget`}
          />
        </div>

        {/* Details */}
        <div className='grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-4 sm:grid-cols-4 xl:grid-cols-6'>
          <Field
            label='GST number'
            value={
              client.gst_number && (
                <button
                  type='button'
                  onClick={() => setShowFullGst((shown) => !shown)}
                  aria-label={
                    showFullGst ? "Hide GST number" : "Show GST number"
                  }
                  className='inline-flex max-w-full cursor-pointer items-center gap-1.5 font-mono hover:text-emerald-700'>
                  <span className='truncate'>
                    {showFullGst
                      ? client.gst_number
                      : maskGst(client.gst_number)}
                  </span>
                  {showFullGst ? (
                    <EyeOff className='size-3 shrink-0 text-gray-400' />
                  ) : (
                    <Eye className='size-3 shrink-0 text-gray-400' />
                  )}
                </button>
              )
            }
          />
          <Field
            label='Phone'
            value={
              client.contact_number && (
                <a
                  href={`tel:${client.contact_number}`}
                  className='hover:text-emerald-700 hover:underline'>
                  {client.contact_number}
                </a>
              )
            }
          />
          <Field
            label='Email'
            value={
              client.email && (
                <a
                  href={`mailto:${client.email}`}
                  title={client.email}
                  className='hover:text-emerald-700 hover:underline'>
                  {client.email}
                </a>
              )
            }
          />
          <Field
            label='Last updated'
            value={formatDate(client.updated_at)}
          />
          <Field
            label='Address'
            value={address}
            className='col-span-2'
          />
        </div>
      </div>

      <ContactDialog
        open={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        users={clientUsers}
        clientId={clientId}
      />
    </>
  );
};

export default ClientDetailsCard;
