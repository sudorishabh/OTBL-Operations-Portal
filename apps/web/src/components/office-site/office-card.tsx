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
  canManage?: boolean;
};

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
    <div className='bg-white rounded-xl hover:border-emerald-400 border border-gray-50 shadow-sm hover:shadow-lg transition-all duration-300 p-3 sm:p-4'>
      <div className='flex flex-col gap-4 border-b border-gray-100 pb-4 mb-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='break-words font-semibold leading-tight text-gray-900'>
              {capitalizeEachWord(office.name)}
            </h3>
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

          <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500'>
            <div className='group relative inline-flex'>
              <button
                type='button'
                className='-ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300'>
                <Info className='size-3.5' />
                Info
              </button>

              <div className='pointer-events-none absolute left-0 top-full z-30 w-80 max-w-[calc(100vw-2rem)] origin-top-left scale-95 pt-2 opacity-0 transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100 sm:w-96'>
                <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5'>
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
                    <InfoRow icon={Mail} label='Email' value={office.email} />
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
                            ? "Office Operator"
                            : "Office Operators"}
                        </span>
                      </div>
                    </div>
                  </div>

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

            {office.manager?.name ? (
              <span className='inline-flex items-center gap-1'>
                <UserCog className='size-3.5 text-gray-400' />
                <span className='text-gray-600'>
                  {capitalFirstLetter(office.manager.name)}
                </span>
              </span>
            ) : null}

            <span className='inline-flex items-center gap-1'>
              <Users className='size-3.5 text-gray-400' />
              <span className='font-medium text-gray-600'>
                {office.operators.length}
              </span>
              {office.operators.length === 1
                ? "Office Operator"
                : "Office Operators"}
            </span>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end'>
          <span className='inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500 ring-1 ring-inset ring-gray-200'>
            <Building2 className='size-3.5 text-emerald-600' />
            <span className='font-semibold text-gray-700'>
              {office.siteCount}
            </span>
            {office.siteCount === 1 ? "Site" : "Sites"}
          </span>

          <div className='mx-0.5 hidden h-6 w-px bg-gray-200 lg:block' />

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
          {office.canManage && (
            <CustomButton
              text='Create Site'
              Icon={Plus}
              variant='outline'
              onClick={handleAddSiteDialogOpen}
            />
          )}
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
