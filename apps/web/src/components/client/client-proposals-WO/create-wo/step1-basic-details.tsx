"use client";
import React from "react";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import { constants } from "@pkg/utils";
import { useFormContext } from "react-hook-form";

const { processTypeOptions } = constants;

interface Step1BasicDetailsProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  filesError: string;
  isUploading: boolean;
  progress: number;
  onNext: () => void;
  onCancel: () => void;
}

const Step1BasicDetails: React.FC<Step1BasicDetailsProps> = ({
  files,
  onFilesChange,
  filesError,
  isUploading,
  progress,
  onNext,
  onCancel,
}) => {
  const form = useFormContext();

  return (
    <div className='flex-1 flex flex-col justify-between h-full'>
      <div className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='md:col-span-2'>
            <Input
              control={form.control}
              fieldName='title'
              Label='Title'
              placeholder='Enter title'
            />
          </div>
          <Input
            control={form.control}
            fieldName='code'
            Label='Work Order Code'
            placeholder='Enter work order code'
          />

          <Input
            control={form.control}
            fieldName='process_type'
            Label='Process Type'
            isSelect
            selectOptions={processTypeOptions}
            placeholder='Select process type'
          />
          <Input
            control={form.control}
            fieldName='agreement_number'
            Label='Agreement Number'
            placeholder='Enter agreement number'
          />
          <Input
            control={form.control}
            fieldName='rate_contract_number'
            Label='Rate Contract Number'
            placeholder='Enter rate contract number'
          />

          <Input
            control={form.control}
            fieldName='start_date'
            Label='Start Date'
            isDate
          />
          <Input
            control={form.control}
            fieldName='end_date'
            Label='End Date'
            isDate
          />
          <Input
            control={form.control}
            fieldName='handing_over_date'
            Label='Handing Over Date'
            isDate
          />

          <Input
            control={form.control}
            fieldName='job_number'
            Label='Job Number'
            placeholder='Enter job number'
          />
          <Input
            control={form.control}
            fieldName='joint_estimate_number'
            Label='Joint Estimate Number'
            placeholder='Enter joint estimate number'
          />
          <Input
            control={form.control}
            fieldName='area'
            Label='Area'
            placeholder='Enter area'
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Input
            control={form.control}
            fieldName='installation_type'
            Label='Installation Type'
            placeholder='Enter installation type'
          />

          <Input
            control={form.control}
            fieldName='land_owner_name'
            Label='Land Owner Name'
            placeholder='Enter land owner name'
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Input
            control={form.control}
            fieldName='remarks'
            Label='Remarks'
            isTextArea
            optional
            placeholder='Enter remarks'
          />

          <Input
            control={form.control}
            fieldName='description'
            Label='Description'
            isTextArea
            optional
            placeholder='Enter description'
          />
        </div>

        <div>
          <DocumentsField
            label='Work Order Documents *'
            files={files}
            onFilesChange={onFilesChange}
            isUploading={isUploading}
            progress={progress}
          />
          {filesError && (
            <p className='mt-1 text-xs text-destructive'>{filesError}</p>
          )}
        </div>
      </div>

      <div className='flex items-center justify-end gap-3 pt-4'>
        <CustomButton
          type='button'
          text='Cancel'
          variant='outline'
          onClick={onCancel}
          disabled={isUploading}
        />
        <CustomButton
          type='button'
          text='Next: Schedule of Rates'
          variant='primary'
          onClick={onNext}
          disabled={isUploading}
        />
      </div>
    </div>
  );
};

export default Step1BasicDetails;
