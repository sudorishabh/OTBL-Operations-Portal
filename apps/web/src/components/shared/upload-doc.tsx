"use client";

import React, { useRef } from "react";
import { Upload, X, FileText, CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";
import { useUploadDocument } from "@/hooks/useUploadDocument";

interface UploadedFile {
  id: string;
  name: string;
  webUrl: string;
}

interface UploadDocProps {
  onUploadComplete: (filePath: string) => void;
  onFileChange?: (file: UploadedFile | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  folderPath: string;
  label?: string;
  allowedExtensions?: string[];
  maxSizeMB?: number;
  className?: string;
}

const UploadDoc: React.FC<UploadDocProps> = ({
  onUploadComplete,
  onFileChange,
  onUploadingChange,
  folderPath,
  label = "Upload Document",
  allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"],
  maxSizeMB = 50,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    file,
    uploading,
    progress,
    uploadedFile,
    handleFileSelect,
    handleDrop,
    handleUpload,
    clearFile: hookClearFile,
    removeFile,
    isDeleting,
  } = useUploadDocument({
    folderPath,
    allowedExtensions,
    maxSizeMB,
    onUploadComplete,
    onFileChange,
    onUploadingChange,
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearFile = () => {
    hookClearFile();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFile();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className='text-sm font-medium text-gray-700'>{label}</div>

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className='border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors'>
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleFileSelect}
            className='hidden'
            accept={allowedExtensions.join(",")}
          />
          <Upload className='h-8 w-8 text-gray-400 mb-2' />
          <p className='text-sm text-gray-500 font-medium'>
            Click or drag file to upload
          </p>
          <p className='text-xs text-gray-400 mt-1'>
            Max size: {maxSizeMB}MB. Allowed: {allowedExtensions.join(" ")}
          </p>
        </div>
      ) : (
        <div className='border border-gray-200 rounded-lg p-4 bg-white'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center space-x-3 overflow-hidden'>
              <div className='bg-primary/10 p-2 rounded-full'>
                <FileText className='h-5 w-5 text-primary' />
              </div>
              <div className='truncate'>
                <p className='text-sm font-medium truncate'>{file.name}</p>
                <p className='text-xs text-gray-500'>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <div className='shrink-0'>
              {!uploading && !uploadedFile && (
                <Button
                  size='sm'
                  variant='ghost'
                  type='button'
                  onClick={clearFile}
                  className='h-8 w-8 p-0 text-gray-500 hover:text-red-500'>
                  <X className='h-4 w-4' />
                </Button>
              )}
              {uploadedFile && (
                <CheckCircle className='h-5 w-5 text-green-500' />
              )}
            </div>
          </div>

          {uploading && (
            <div className='space-y-1'>
              <Progress
                value={progress}
                className='h-2'
              />
              <p className='text-xs text-gray-500 text-center'>Uploading...</p>
            </div>
          )}

          {isDeleting && (
            <div className='space-y-1'>
              <p className='text-xs text-red-500 text-center'>Deleting...</p>
            </div>
          )}

          {!uploading && !uploadedFile && !isDeleting && (
            <Button
              onClick={handleUpload}
              type='button'
              className='w-full mt-2'
              size='sm'
              disabled={uploading}>
              Upload
            </Button>
          )}

          {uploadedFile && !isDeleting && (
            <div className='mt-2 flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                type='button'
                className='flex-1'
                onClick={() => window.open(uploadedFile.webUrl, "_blank")}>
                View
              </Button>
              <Button
                variant='destructive'
                size='sm'
                type='button'
                className='flex-1'
                onClick={handleManualDelete}>
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadDoc;
