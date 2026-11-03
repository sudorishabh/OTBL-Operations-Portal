"use client";
import React from "react";
import Input from "@/components/shared/input";
import DocumentsField from "@/components/shared/documents-field";
import type { StoredDocument } from "@/lib/documents";
import { constants } from "@pkg/utils";
import { useFormContext } from "react-hook-form";

const { processTypeOptions } = constants;

interface Props {
  // The process type is fixed once the work order exists.
  showProcessType?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  existing?: StoredDocument[];
  onRemoveExisting?: (index: number) => void;
  filesError: string;
  isUploading: boolean;
  progress: number;
}

// The work order's own details and documents, shared by the create and edit
// forms. Reads the form from context.
const WorkOrderDetailsFields = ({
  showProcessType = true,
  files,
  onFilesChange,
  existing,
  onRemoveExisting,
  filesError,
  isUploading,
  progress,
}: Props) => {
  const form = useFormContext();

  return (
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

        {showProcessType && (
          <Input
            control={form.control}
            fieldName='process_type'
            Label='Process Type'
            isSelect
            selectOptions={processTypeOptions}
            placeholder='Select process type'
          />
        )}
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
          existing={existing}
          onRemoveExisting={onRemoveExisting}
          isUploading={isUploading}
          progress={progress}
        />
        {filesError && (
          <p className='mt-1 text-xs text-destructive'>{filesError}</p>
        )}
      </div>
    </div>
  );
};

export default WorkOrderDetailsFields;
