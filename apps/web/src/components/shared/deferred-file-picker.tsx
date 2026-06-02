"use client";

import React, { useRef, useCallback } from "react";
import { Upload, X, FileText, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface DeferredFilePickerProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  isUploaded?: boolean;
  uploadProgress?: number;
  isUploading?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
  isUploadBgWhite?: boolean;
  uploadedUrl?: string;
  label?: string;
  allowedExtensions?: string[];
  maxSizeMB?: number;
  className?: string;
  helperText?: string;
  multiple?: boolean;
}

const DeferredFilePicker: React.FC<DeferredFilePickerProps> = ({
  onFileSelect,
  selectedFile,
  isUploaded = false,
  uploadProgress = 0,
  isUploading = false,
  isDeleting = false,
  isUploadBgWhite = true,
  onDelete,
  uploadedUrl,
  label = "Select Document",
  allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"],
  maxSizeMB = 50,
  className,
  helperText,
  multiple = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        toast.error(`File size must be less than ${maxSizeMB}MB`);
        return false;
      }

      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        toast.error(
          `Invalid file type. Allowed: ${allowedExtensions.join(", ")}`,
        );
        return false;
      }

      return true;
    },
    [allowedExtensions, maxSizeMB],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (multiple) {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
          if (validateFile(file)) {
            onFileSelect(file);
          }
        });
      } else {
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect, validateFile, multiple],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (multiple) {
        const files = Array.from(e.dataTransfer.files || []);
        files.forEach((file) => {
          if (validateFile(file)) {
            onFileSelect(file);
          }
        });
      } else {
        const file = e.dataTransfer.files?.[0];
        if (file && validateFile(file)) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect, validateFile, multiple],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClear = useCallback(() => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onFileSelect]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onDelete]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={cn("w-full", className)}>
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "group border border-dashed border-gray-300 rounded-md px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50/50 hover:border-primary/40 transition-all",
            isUploadBgWhite && "bg-white",
          )}>
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleFileChange}
            className='hidden'
            accept={allowedExtensions.join(",")}
            multiple={multiple}
          />
          <Upload className='h-4 w-4 text-gray-400 group-hover:text-primary/60 transition-colors' />
          <span className='text-xs text-gray-500 group-hover:text-gray-600'>
            {label}
          </span>
          <span className='text-xs text-gray-400 ml-auto hidden sm:inline'>
            {allowedExtensions.slice(0, 3).join(", ")}
            {allowedExtensions.length > 3 ? "..." : ""} • {maxSizeMB}MB
          </span>
        </div>
      ) : (
        <div className='border border-gray-200 rounded-md px-3 py-2 bg-white flex items-center gap-2'>
          <div
            className={cn(
              "shrink-0 p-1.5 rounded-md",
              isUploaded
                ? "bg-green-50"
                : isUploading
                  ? "bg-primary/5"
                  : "bg-gray-50",
            )}>
            {isUploading ? (
              <Loader2 className='h-3.5 w-3.5 text-primary animate-spin' />
            ) : isUploaded ? (
              <CheckCircle className='h-3.5 w-3.5 text-green-600' />
            ) : isDeleting ? (
              <Loader2 className='h-3.5 w-3.5 text-red-500 animate-spin' />
            ) : (
              <FileText className='h-3.5 w-3.5 text-gray-500' />
            )}
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium text-gray-700 truncate max-w-[180px]'>
                {selectedFile.name}
              </span>
              <span className='text-xs text-gray-400 shrink-0'>
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            {isUploading && (
              <div className='flex items-center gap-2 mt-0.5'>
                <Progress
                  value={uploadProgress}
                  className='h-1 flex-1 max-w-[120px]'
                  indicatorClassName='bg-emerald-600'
                />
                <span className='text-xs text-gray-400'>{uploadProgress}%</span>
              </div>
            )}
            {isDeleting && (
              <span className='text-xs text-red-500'>Deleting...</span>
            )}
            {!isUploading && !isUploaded && !isDeleting && (
              <span className='text-xs text-amber-600 flex items-center gap-1'>
                <span className='w-1.5 h-1.5 bg-amber-500 rounded-full' />
                Pending upload
              </span>
            )}
          </div>

          <div className='shrink-0 flex items-center gap-1'>
            {isUploaded && !isDeleting && uploadedUrl && (
              <Button
                variant='ghost'
                size='sm'
                type='button'
                className='h-7 px-2 text-xs text-gray-600 hover:text-primary'
                onClick={() => window.open(uploadedUrl, "_blank")}>
                View
              </Button>
            )}
            {isUploaded && !isDeleting && onDelete && (
              <Button
                variant='ghost'
                size='sm'
                type='button'
                className='h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50'
                onClick={handleDelete}>
                <X className='h-3.5 w-3.5' />
              </Button>
            )}
            {!isUploading && !isDeleting && !isUploaded && (
              <Button
                size='sm'
                variant='ghost'
                type='button'
                onClick={handleClear}
                className='h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50'>
                <X className='h-3.5 w-3.5' />
              </Button>
            )}
          </div>
        </div>
      )}

      {helperText && <p className='text-xs text-gray-400 mt-1'>{helperText}</p>}
    </div>
  );
};

export default DeferredFilePicker;
