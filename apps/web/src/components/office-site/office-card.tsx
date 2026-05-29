import {
  Building2,
  Calendar,
  Info,
  Mail,
  MapPin,
  Plus,
  ReceiptText,
  UserCog,
  Users,
} from "lucide-react";
import React from "react";
import OfficeSiteTable from "./office-site-table";
import { capitalizeEachWord, capitalFirstLetter } from "@pkg/utils";
import CustomButton from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";

type Site = {
  id: number;
  name: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  office_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  users: {
    id: number;
    name: string;
    email: string;
    role: string;
  }[];
};

type Office = {
  id: number;
  name: string;
  address: string;
  state: string;
  city: string;
  gst_number: string;
  pincode: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
  siteCount: number;
  operators: {
    id: number;
    name: string;
    email: string;
    role: string;
  }[];
  manager: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  /** True when the current user (admin or this office's manager) may manage members. */
  canManage?: boolean;
};

/** A single labelled row inside the office information hover panel. */
const InfoRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}> = ({ icon: Icon, label, value }) => (
  <div className='flex items-start gap-2.5'>
    <Icon className='mt-0.5 size-3.5 shrink-0 text-slate-400' />
    <div className='min-w-0 leading-tight'>
      <p className='text-[10px] font-medium uppercase tracking-wide text-slate-400'>
        {label}
      </p>
      <p className='break-words text-xs text-slate-700'>{value}</p>
    </div>
  </div>
);

const OfficeCard: React.FC<{ office: Office }> = ({ office }) => {
  const { setParams } = useHandleParams();
  const isActive = office.status?.toLowerCase() === "active";

  const handleAddSiteDialogOpen = () => {
    setParams({
      dialog: "create-site",
      officeId: office.id.toString(),
      officeName: office.name,
    });
  };

  const handleOfficeDetailsDialogOpen = () => {
    setParams({
      dialog: "view-office",
      officeId: office.id.toString(),
      officeName: office.name,
    });
  };

  const handleManageMembersOpen = () => {
    setParams({
      dialog: "manage-office-members",
      officeId: office.id.toString(),
      officeName: office.name,
    });
  };

  return (
    <div className='bg-white rounded-xl hover:border-emerald-400 border border-gray-50 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden p-3 sm:p-4'>
      <div className='flex flex-col gap-3 pb-2 mb-2 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0'>
          <div>
            <div className='flex flex-wrap items-center relative gap-2 sm:gap-3'>
              <h3 className='text-gray-800 font-medium break-words'>
                {capitalizeEachWord(office.name)}
              </h3>
              <div className='group relative inline-flex'>
                <button
                  type='button'
                  className='flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11.5px] font-medium text-sky-700 ring-1 ring-inset ring-sky-100 transition-colors hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300'>
                  <Info className='size-3.5' />
                  Information
                </button>

                {/* Hover / focus information panel */}
                <div className='pointer-events-none absolute left-0 top-full z-30 w-80 max-w-[calc(100vw-2rem)] origin-top-left scale-95 pt-2 opacity-0 transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100 sm:w-96'>
                  <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5'>
                    {/* Header */}
                    <div className='flex items-start justify-between gap-3 border-b border-slate-100 bg-linear-to-br from-slate-50 to-white px-4 py-3'>
                      <div className='flex min-w-0 items-start gap-2.5'>
                        <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100'>
                          <Building2 className='size-4' />
                        </span>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold text-slate-800'>
                            {capitalizeEachWord(office.name)}
                          </p>
                          <p className='text-[11px] text-slate-400'>
                            Office overview
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
                        }`}>
                        <span
                          className={`size-1.5 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {capitalFirstLetter(office.status)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className='space-y-3 px-4 py-3'>
                      <InfoRow
                        icon={MapPin}
                        label='Address'
                        value={`${capitalFirstLetter(office.address)}${
                          office.city
                            ? `, ${capitalizeEachWord(office.city)}`
                            : ""
                        }${
                          office.state
                            ? `, ${capitalizeEachWord(office.state)}`
                            : ""
                        }${office.pincode ? ` – ${office.pincode}` : ""}`}
                      />
                      <InfoRow
                        icon={Mail}
                        label='Email'
                        value={office.email}
                      />
                      {office.gst_number ? (
                        <InfoRow
                          icon={ReceiptText}
                          label='GST Number'
                          value={office.gst_number}
                        />
                      ) : null}
                      {office.manager?.name ? (
                        <InfoRow
                          icon={UserCog}
                          label='Manager'
                          value={capitalizeEachWord(office.manager.name)}
                        />
                      ) : null}

                      {/* Stats */}
                      <div className='flex items-center gap-2 pt-0.5'>
                        <div className='flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-inset ring-slate-100'>
                          <Building2 className='size-3.5 text-emerald-600' />
                          <span className='text-xs font-semibold text-slate-700'>
                            {office.siteCount}
                          </span>
                          <span className='text-[11px] text-slate-400'>
                            {office.siteCount === 1 ? "Site" : "Sites"}
                          </span>
                        </div>
                        <div className='flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-inset ring-slate-100'>
                          <Users className='size-3.5 text-emerald-600' />
                          <span className='text-xs font-semibold text-slate-700'>
                            {office.operators.length}
                          </span>
                          <span className='text-[11px] text-slate-400'>
                            {office.operators.length === 1
                              ? "Operator"
                              : "Operators"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className='flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-500'>
                      <Calendar className='size-3.5 text-slate-400' />
                      Created{" "}
                      {new Date(office.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {(office.manager?.name || office.operators.length > 0) && (
            <div className='text-xs text-gray-500 mt-1'>
              {office.manager?.name ? (
                <span className='mr-3'>
                  Manager: {capitalFirstLetter(office.manager.name)}
                </span>
              ) : null}
              {office.operators.length > 0 ? (
                <span>Operators: {office.operators.length}</span>
              ) : null}
            </div>
          )}
          <div className='mt-1'></div>
        </div>
        <div className='flex flex-wrap items-center gap-2 lg:gap-4 lg:justify-end lg:text-right'>
          <div className='rounded-full flex items-center gap-2 border px-1.5 py-1.5 bg-gray-100'>
            <span className='text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap'>
              {office.siteCount} {office.siteCount === 1 ? "Site" : "Sites"}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border border-green-200 whitespace-nowrap ${
                office.status === "active"
                  ? "bg-green-200 text-green-900"
                  : "bg-gray-200 text-gray-900"
              }`}>
              {capitalFirstLetter(office.status)}
            </span>
          </div>

          <CustomButton
            arrowType='upright'
            variant='arrow'
            onClick={handleOfficeDetailsDialogOpen}
          />
          {office.canManage && (
            <CustomButton
              text='Members'
              Icon={Users}
              variant='outline'
              onClick={handleManageMembersOpen}
            />
          )}
          <CustomButton
            text='Create Site'
            Icon={Plus}
            variant='outline'
            onClick={handleAddSiteDialogOpen}
            disableForViewer
          />
        </div>
      </div>
      <OfficeSiteTable officeId={office.id} />

      {office.siteCount > 6 && (
        <div className='flex items-center justify-center pt-3'>
          <p className='text-sm text-gray-500'>
            {office.siteCount - 6} more sites
          </p>
        </div>
      )}

    </div>
  );
};
export default OfficeCard;
