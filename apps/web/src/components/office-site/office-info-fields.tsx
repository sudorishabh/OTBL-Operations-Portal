import React from "react";
import { useFormContext } from "react-hook-form";
import { Building2, Globe, Hash, Mail, MapPin } from "lucide-react";
import Input from "@/components/shared/input";
import { officeTypes } from "@pkg/schema";

type OfficeInfoValues = Omit<officeTypes.updateOfficeType, "id" | "status">;

// Shared by the create and edit office dialogs; reads the surrounding <Form>.
const OfficeInfoFields = () => {
  const { control } = useFormContext<OfficeInfoValues>();

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Input
          control={control}
          fieldName='name'
          Label='Office Name'
          LabelIcon={Building2}
          placeholder='Enter office name'
        />

        <Input
          control={control}
          fieldName='email'
          Label='Email'
          LabelIcon={Mail}
          type='email'
          placeholder='Enter email'
        />
      </div>

      <Input
        control={control}
        fieldName='address'
        Label='Address'
        LabelIcon={MapPin}
        placeholder='Enter address'
      />

      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Input
          control={control}
          fieldName='state'
          Label='State'
          LabelIcon={Globe}
          placeholder='Enter state'
        />
        <Input
          control={control}
          fieldName='city'
          Label='City'
          LabelIcon={Globe}
          placeholder='Enter city'
        />
        <Input
          control={control}
          fieldName='pincode'
          Label='Pincode'
          LabelIcon={Hash}
          placeholder='Enter pincode'
        />
        <Input
          control={control}
          fieldName='gst_number'
          Label='GST Number'
          LabelIcon={Hash}
          placeholder='Enter GST number'
        />
      </div>
    </>
  );
};

export default OfficeInfoFields;
