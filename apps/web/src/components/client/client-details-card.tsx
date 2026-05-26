import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MapPin, Phone, Users, Eye, EyeOff, LucideIcon } from "lucide-react";
import CustomButton from "@/components/shared/btn";
import ContactDialog from "./contact-dialog";
import { capitalFirstLetter } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import Error from "@/components/shared/error";
import ClientInfoSkeleton from "../skeleton/client/client-info-skeleton";
import ClientStats from "./client-stats/client-stats";
import useHandleParams from "@/hooks/useHandleParams";

interface Props {
  clientId: string;
}

type DialogType = "contacts";

interface DialogState {
  contacts: boolean;
}

const IconContainer = ({
  Icon,
  className = "",
}: {
  Icon: LucideIcon;
  className?: string;
}) => (
  <div
    className={`size-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center ${className}`}>
    <Icon className='size-3.5 text-cyan-800' />
  </div>
);

const InfoSection = ({
  Icon,
  label,
  children,
}: {
  Icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) => (
  <div className='flex items-start gap-3'>
    <IconContainer Icon={Icon} />
    <div className='min-w-0 flex-1'>
      <div className='text-[11px] uppercase tracking-wide text-gray-500'>
        {label}
      </div>
      {children}
    </div>
  </div>
);

const ClientDetailsCard = ({ clientId }: Props) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    contacts: false,
  });

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

  useEffect(() => {
    if (clientData?.client) {
      setParam("name", clientData.client.name);
    }
  }, [clientData?.client, setParam]);

  const formatDate = useCallback((d?: string): string => {
    try {
      return d ? format(new Date(d), "dd MMM yyyy") : "-";
    } catch {
      return d ?? "-";
    }
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    const s = (status || "").toLowerCase();
    if (s === "active" || s === "enabled")
      return "bg-emerald-100 text-emerald-800";
    if (s === "inactive" || s === "disabled")
      return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-800";
  }, []);

  const maskGst = useCallback((gst?: string): string => {
    if (!gst) return "-";
    if (gst.length <= 6) return gst;
    return `${gst.slice(0, 3)}...${gst.slice(-3)}`;
  }, []);

  const toggleDialog = useCallback((dialogType: DialogType) => {
    setDialogState((prev) => ({
      ...prev,
      [dialogType]: !prev[dialogType],
    }));
  }, []);

  const closeDialog = useCallback((dialogType: DialogType) => {
    setDialogState((prev) => ({
      ...prev,
      [dialogType]: false,
    }));
  }, []);

  // Memoized stats object
  const stats = useMemo(
    () => ({
      siteCount: clientData?.siteCount ?? 0,
      completedWorkOrders: clientData?.completedWorkOrders ?? 0,
      totalBudgetAmount: clientData?.totalBudgetAmount ?? 0,
      totalExpenseAmount: clientData?.totalExpenseAmount ?? 0,
    }),
    [clientData],
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Loading state
  if (isLoading) {
    return <ClientInfoSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <Error
        variant='inline'
        message='Problem fetching Client Details, Please try again later'
      />
    );
  }

  // No client data
  if (!clientData?.client) {
    return (
      <Error
        variant='inline'
        message='Client details not found'
      />
    );
  }

  const { client, clientUsers } = clientData;

  return (
    <>
      <Card className='relative shadow border bg-linear-to-br border-emerald-400 from-white to-gray-50 py-5'>
        <CardHeader className='pb-0'>
          <div className='flex items-start justify-between gap-4'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-3 mt-2 text-xs'>
                <Badge
                  className={`${getStatusColor(client.status)} rounded-md`}>
                  {capitalFirstLetter(client.status)}
                </Badge>

                {client.gst_number && (
                  <div className='text-slate-500'>
                    GST:
                    <button
                      type='button'
                      onClick={() => setShowFullGst((s) => !s)}
                      aria-expanded={showFullGst}
                      aria-label={
                        showFullGst ? "Hide GST number" : "Show GST number"
                      }
                      className='text-slate-700 font-medium ml-1 inline-flex items-center gap-2 hover:underline cursor-pointer'>
                      <span className='truncate'>
                        {showFullGst
                          ? client.gst_number
                          : maskGst(client.gst_number)}
                      </span>
                      {showFullGst ? (
                        <EyeOff
                          className='size-3 text-gray-500'
                          aria-hidden='true'
                        />
                      ) : (
                        <Eye
                          className='size-3 text-gray-500'
                          aria-hidden='true'
                        />
                      )}
                    </button>
                  </div>
                )}

                <div className='text-slate-400'>
                  Created: {formatDate(client.created_at)}
                </div>
                <div className='text-slate-400'>
                  Updated: {formatDate(client.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className='gap-6 text-sm'>
            <div className='flex flex-col sm:flex-row justify-between gap-4'>
              <div className='flex items-start gap-4 flex-1'>
                <InfoSection
                  Icon={MapPin}
                  label='Address'>
                  <p className='text-gray-700 font-medium wrap-break-word text-xs'>
                    {client.address}
                  </p>
                  <p className='text-gray-500 text-xs'>
                    {client.city}, {client.state} - {client.pincode}
                  </p>
                </InfoSection>
              </div>

              <div className='flex-1 gap-4'>
                <InfoSection
                  Icon={Phone}
                  label='Company Contacts'>
                  <div className='flex text-xs items-center gap-2'>
                    <a
                      href={`tel:${client.contact_number}`}
                      className='text-gray-700 font-medium hover:underline'
                      aria-label={`Call ${client.contact_number}`}>
                      {client.contact_number || "-"}
                    </a>
                    <span aria-hidden='true'>|</span>
                    <a
                      href={`mailto:${client.email}`}
                      className='text-gray-700 font-medium hover:underline truncate block max-w-full'
                      aria-label={`Email ${client.email}`}>
                      {client.email || "-"}
                    </a>
                  </div>

                  <CustomButton
                    variant='outline'
                    Icon={Users}
                    text='View Contacts'
                    onClick={() => toggleDialog("contacts")}
                    className='mt-2 sm:absolute sm:top-3 sm:right-4.5'
                  />
                </InfoSection>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <ClientStats
        stats={stats}
        clientId={clientId}
      />

      {/* Dialogs */}
      <ContactDialog
        open={dialogState.contacts}
        onClose={() => closeDialog("contacts")}
        users={clientUsers}
        clientId={clientId}
      />
    </>
  );
};

export default ClientDetailsCard;
