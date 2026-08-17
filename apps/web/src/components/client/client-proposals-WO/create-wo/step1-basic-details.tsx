"use client";
import React from "react";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import DeferredFilePicker from "@/components/shared/deferred-file-picker";
import { constants } from "@pkg/utils";
import { useFormContext } from "react-hook-form";

const { processTypeOptions } = constants;

interface Step1BasicDetailsProps {
  selectedFile: File | null;
  handleFileSelect: (file: File | null) => void;
  isUploading: boolean;
  progress: number;
  uploadedFile: boolean;
  documentUrl: string;
  deleteFile: () => void;
  isDeleting: boolean;
  onNext: () => void;
  onCancel: () => void;
}

const Step1BasicDetails: React.FC<Step1BasicDetailsProps> = ({
  selectedFile,
  handleFileSelect,
  isUploading,
  progress,
  uploadedFile,
  documentUrl,
  deleteFile,
  isDeleting,
  onNext,
  onCancel,
}) => {
  const form = useFormContext();

  return (
    <div className='flex-1 flex flex-col justify-between h-full'>
      <div className='space-y-3'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-3'>
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

        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-3'>
          <Input
            control={form.control}
            fieldName='remarks'
            Label='Remarks'
            isTextArea
            optional
            placeholder='Enter remarks'
            className='min-h-0 h-16'
          />

          <Input
            control={form.control}
            fieldName='description'
            Label='Description'
            isTextArea
            optional
            placeholder='Enter description'
            className='min-h-0 h-16'
          />
        </div>

        <FormField
          control={form.control}
          name='document_key'
          render={() => (
            <FormItem>
              <FormControl>
                <DeferredFilePicker
                  label='Work Order Document *'
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  isUploading={isUploading}
                  uploadProgress={progress}
                  isUploaded={!!uploadedFile}
                  uploadedUrl={documentUrl}
                  onDelete={deleteFile}
                  isDeleting={isDeleting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className='flex items-center justify-end gap-3 pt-3'>
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
