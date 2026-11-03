"use client";
import React from "react";
import CustomButton from "@/components/shared/btn";
import WorkOrderDetailsFields from "./work-order-details-fields";

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
  return (
    <div className='flex-1 flex flex-col justify-between h-full'>
      <WorkOrderDetailsFields
        files={files}
        onFilesChange={onFilesChange}
        filesError={filesError}
        isUploading={isUploading}
        progress={progress}
      />

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
