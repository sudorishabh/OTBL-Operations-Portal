"use client";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Mail, Phone } from "lucide-react";
import Input from "@/components/shared/input";
import ParentClientField from "./parent-client-field";

// The details a main client and its branches both have.
export type ClientDetailsValues = {
  name: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  gst_number: string;
  contact_number?: string;
  email?: string;
  status?: "active" | "inactive";
  parent_client_id?: number | null;
};

export const EMPTY_CLIENT_DETAILS: ClientDetailsValues = {
  name: "",
  address: "",
  state: "",
  city: "",
  pincode: "",
  gst_number: "",
  contact_number: "",
  email: "",
};

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

interface Props {
  nameLabel: string;
  namePlaceholder: string;
  // A branch picks its main client; a main client has none.
  showParentClient?: boolean;
  // New ones start active, so the status is only set when editing.
  showStatus?: boolean;
}

// The details section of the main client and branch forms, read from the
// surrounding <Form>.
const ClientDetailsFields = ({
  nameLabel,
  namePlaceholder,
  showParentClient,
  showStatus,
}: Props) => {
  const { control } = useFormContext<ClientDetailsValues>();

  return (
    <section className='space-y-4'>
      <h3 className='border-b pb-2 text-base font-semibold text-gray-800'>
        Details
      </h3>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {showParentClient && (
          <div className='md:col-span-2'>
            <ParentClientField />
          </div>
        )}

        <div className={showStatus ? undefined : "md:col-span-2"}>
          <Input
            control={control}
            fieldName='name'
            Label={nameLabel}
            placeholder={namePlaceholder}
          />
        </div>

        {showStatus && (
          <Input
            control={control}
            fieldName='status'
            Label='Status'
            isSelect
            selectOptions={STATUS_OPTIONS}
          />
        )}

        <Input
          control={control}
          fieldName='email'
          Label='Email'
          placeholder='office@example.com'
          inputIcon={Mail}
          optional
        />

        <Input
          control={control}
          fieldName='contact_number'
          Label='Contact Number'
          placeholder='98765 43210 or 011-23456789'
          inputIcon={Phone}
          optional
        />

        <div className='md:col-span-2'>
          <Input
            control={control}
            fieldName='gst_number'
            Label='GST Number'
            placeholder='22AAAAA0000A1Z5'
          />
        </div>

        <div className='md:col-span-2'>
          <Input
            control={control}
            fieldName='address'
            Label='Address'
            placeholder='Building, street, area'
          />
        </div>

        <Input
          control={control}
          fieldName='city'
          Label='City'
          placeholder='Enter city'
        />

        <Input
          control={control}
          fieldName='state'
          Label='State'
          placeholder='Enter state'
        />

        <Input
          control={control}
          fieldName='pincode'
          Label='Pincode'
          placeholder='110001'
        />
      </div>
    </section>
  );
};

export default ClientDetailsFields;
