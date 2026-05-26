import { Info, Plus, Users } from "lucide-react";
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
};

const OfficeCard: React.FC<{ office: Office }> = ({ office }) => {
  const { setParams } = useHandleParams();

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
              <div className='bg-sky-100 group rounded-full text-xs text-sky-800 flex items-center px-2.5 py-1 max-w-full'>
                <span className='flex items-center justify-center gap-1 text-sky-700 text-[11.5px] font-medium'>
                  <Info className='size-3.5' />
                  Information
                </span>

                <div className='hidden group-hover:block absolute left-0 top-full mt-2 w-72 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-md drop-shadow-xl p-3 text-sm text-gray-700 z-30'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <div className='font-medium text-gray-800'>
                        {capitalizeEachWord(office.name)}
                      </div>
                      <div className='text-xs text-gray-600 mt-1 whitespace-pre-line'>
                        {office.address}
                        {office.city ? `, ${office.city}` : ""}
                        {office.state ? `, ${office.state}` : ""} -{" "}
                        {office.pincode}
                      </div>
                      <div className='text-xs text-gray-500 mt-2'>
                        Email: {office.email}
                      </div>
                      <div className='text-xs text-gray-500'>
                        GST: {office.gst_number}
                      </div>
                      {office.manager?.name ? (
                        <div className='text-xs text-gray-500'>
                          Manager: {capitalFirstLetter(office.manager.name)}
                        </div>
                      ) : null}
                      {office.operators.length > 0 ? (
                        <div className='text-xs text-gray-500'>
                          Operators: {office.operators.length}
                        </div>
                      ) : null}
                    </div>
                    <div className='text-right'>
                      <div
                        className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${office.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}>
                        {office.status}
                      </div>
                      <div className='text-xs text-gray-400 mt-2'>
                        Created:
                        {new Date(office.created_at).toLocaleDateString()}
                      </div>
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
          <CustomButton
            text='Members'
            Icon={Users}
            variant='outline'
            onClick={handleManageMembersOpen}
          />
          <CustomButton
            text='Create Site'
            Icon={Plus}
            variant='outline'
            onClick={handleAddSiteDialogOpen}
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
