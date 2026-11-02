"use client";

import React, { useRef, useCallback, useState } from "react";
import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File as FileIcon,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { constants } from "@pkg/utils";

const { MAX_DOCUMENTS, DOCUMENT_EXTENSIONS } = constants;

export const getFileTypeStyle = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    return { Icon: FileText, bg: "bg-red-50", text: "text-red-500" };
  }
  if (["doc", "docx"].includes(ext)) {
    return { Icon: FileText, bg: "bg-blue-50", text: "text-blue-500" };
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return {
      Icon: FileSpreadsheet,
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    };
  }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return { Icon: ImageIcon, bg: "bg-purple-50", text: "text-purple-500" };
  }
  return { Icon: FileIcon, bg: "bg-gray-100", text: "text-gray-500" };
};

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
  // Multiple mode: the cap, and how many files the parent already holds.
  maxFiles?: number;
  fileCount?: number;
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
  allowedExtensions = DOCUMENT_EXTENSIONS,
  maxSizeMB = 50,
  className,
  helperText,
  multiple = false,
  maxFiles = MAX_DOCUMENTS,
  fileCount = 0,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const remainingSlots = Math.max(maxFiles - fileCount, 0);
  const isFull = multiple && remainingSlots === 0;

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

  // Multiple mode keeps only as many valid files as there are slots left.
  const acceptFiles = useCallback(
    (files: File[]) => {
      const validFiles = files.filter(validateFile);
      if (validFiles.length > remainingSlots) {
        toast.error(
          remainingSlots === 0
            ? `You can add up to ${maxFiles} files`
            : `Only ${remainingSlots} more ${remainingSlots === 1 ? "file" : "files"} can be added (up to ${maxFiles})`,
        );
      }
      validFiles.slice(0, remainingSlots).forEach(onFileSelect);
    },
    [validateFile, remainingSlots, maxFiles, onFileSelect],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (multiple) {
        acceptFiles(Array.from(e.target.files || []));
        // Let the same file be picked again after it is removed.
        e.target.value = "";
      } else {
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect, validateFile, multiple, acceptFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (multiple) {
        acceptFiles(Array.from(e.dataTransfer.files || []));
      } else {
        const file = e.dataTransfer.files?.[0];
        if (file && validateFile(file)) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect, validateFile, multiple, acceptFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
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

  const types =
    allowedExtensions
      .slice(0, 3)
      .map((ext) => ext.replace(".", "").toUpperCase())
      .join(", ") + (allowedExtensions.length > 3 ? " and more" : "");
  const hint = multiple
    ? `Drag files here or browse. ${types}, up to ${remainingSlots} ${remainingSlots === 1 ? "file" : "files"}, ${maxSizeMB} MB each.`
    : `Drag a file here or browse. ${types}, up to ${maxSizeMB} MB.`;

  return (
    <div className={cn("w-full", className)}>
      {isFull ? (
        <div className='rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500'>
          You&apos;ve added the maximum of {maxFiles} files. Remove one to add
          another.
        </div>
      ) : !selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role='button'
          tabIndex={0}
          aria-label={label}
          title={`Accepts ${allowedExtensions.join(", ")}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "group flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-primary/50 hover:bg-gray-50/60",
            isUploadBgWhite && !isDragActive && "bg-white",
          )}>
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleFileChange}
            className='hidden'
            accept={allowedExtensions.join(",")}
            multiple={multiple}
          />
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
              isDragActive
                ? "bg-primary/10"
                : "bg-gray-100 group-hover:bg-primary/10",
            )}>
            <Upload
              className={cn(
                "size-3.5 transition-colors",
                isDragActive
                  ? "text-primary"
                  : "text-gray-400 group-hover:text-primary/70",
              )}
            />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-xs font-medium text-gray-700'>
              {isDragActive ? "Drop to add" : label}
            </p>
            <p className='truncate text-[11px] text-gray-400'>{hint}</p>
          </div>
          {/* The whole zone opens the picker; this only shows that it does. */}
          <span
            aria-hidden
            className='shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors group-hover:border-primary/40 group-hover:text-primary'>
            Browse
          </span>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border bg-white px-2.5 py-2 transition-colors",
            isUploaded ? "border-emerald-200" : "border-gray-200",
          )}>
          <div className='relative shrink-0'>
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-md",
                getFileTypeStyle(selectedFile.name).bg,
              )}>
              {isUploading || isDeleting ? (
                <Loader2
                  className={cn(
                    "size-3.5 animate-spin",
                    isDeleting ? "text-red-500" : "text-primary",
                  )}
                />
              ) : (
                (() => {
                  const { Icon, text } = getFileTypeStyle(selectedFile.name);
                  return <Icon className={cn("size-3.5", text)} />;
                })()
              )}
            </div>
            {isUploaded && !isDeleting && (
              <CheckCircle className='absolute -bottom-1 -right-1 size-3.5 rounded-full bg-white text-emerald-600' />
            )}
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex items-baseline gap-2'>
              <span
                className='min-w-0 truncate text-xs font-medium text-gray-700'
                title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <span className='shrink-0 text-[11px] text-gray-400'>
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            {isUploading && (
              <div className='flex items-center gap-2 mt-1'>
                <Progress
                  value={uploadProgress}
                  className='h-1.5 flex-1 max-w-[160px]'
                  indicatorClassName='bg-primary'
                />
                <span className='text-[11px] tabular-nums text-gray-400'>
                  {uploadProgress}%
                </span>
              </div>
            )}
            {isDeleting && (
              <span className='text-[11px] text-red-500'>Removing file…</span>
            )}
            {!isUploading && !isUploaded && !isDeleting && (
              <span className='inline-flex items-center gap-1.5 text-[11px] text-amber-700'>
                <span className='w-1.5 h-1.5 bg-amber-500 rounded-full' />
                Ready to upload
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

      {helperText && (
        <p className='mt-1 text-[11px] text-gray-400'>{helperText}</p>
      )}
    </div>
  );
};

export default DeferredFilePicker;
