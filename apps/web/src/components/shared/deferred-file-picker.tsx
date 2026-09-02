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

const getFileTypeStyle = (fileName: string) => {
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
  const [isDragActive, setIsDragActive] = useState(false);

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
      setIsDragActive(false);

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

  return (
    <div className={cn("w-full", className)}>
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "group border-2 border-dashed rounded-lg px-4 py-4 flex items-center gap-3 cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-primary/40 hover:bg-gray-50/50",
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
              "shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-colors",
              isDragActive
                ? "bg-primary/10"
                : "bg-gray-100 group-hover:bg-primary/10",
            )}>
            <Upload
              className={cn(
                "h-4 w-4 transition-colors",
                isDragActive
                  ? "text-primary"
                  : "text-gray-400 group-hover:text-primary/70",
              )}
            />
          </div>
          <div className='min-w-0'>
            <p className='text-sm font-medium text-gray-700'>{label}</p>
            <p className='text-xs text-gray-400 mt-0.5'>
              Drop a file here or click to browse. Accepts{" "}
              {allowedExtensions
                .slice(0, 3)
                .join(", ")
                .replace(/\./g, "")
                .toUpperCase()}
              {allowedExtensions.length > 3 ? " and more" : ""}, up to{" "}
              {maxSizeMB}MB.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border rounded-lg px-3 py-2.5 bg-white flex items-center gap-3 transition-colors",
            isUploaded ? "border-emerald-200" : "border-gray-200",
          )}>
          <div className='relative shrink-0'>
            <div
              className={cn(
                "h-10 w-10 rounded-md flex items-center justify-center",
                getFileTypeStyle(selectedFile.name).bg,
              )}>
              {isUploading || isDeleting ? (
                <Loader2
                  className={cn(
                    "h-4 w-4 animate-spin",
                    isDeleting ? "text-red-500" : "text-primary",
                  )}
                />
              ) : (
                (() => {
                  const { Icon, text } = getFileTypeStyle(selectedFile.name);
                  return <Icon className={cn("h-4 w-4", text)} />;
                })()
              )}
            </div>
            {isUploaded && !isDeleting && (
              <CheckCircle className='absolute -bottom-1 -right-1 h-4 w-4 text-emerald-600 bg-white rounded-full' />
            )}
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex items-baseline gap-2'>
              <span className='text-sm font-medium text-gray-700 truncate max-w-[220px]'>
                {selectedFile.name}
              </span>
              <span className='text-xs text-gray-400 shrink-0'>
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
                <span className='text-xs text-gray-400 tabular-nums'>
                  {uploadProgress}%
                </span>
              </div>
            )}
            {isDeleting && (
              <span className='text-xs text-red-500'>Removing file…</span>
            )}
            {!isUploading && !isUploaded && !isDeleting && (
              <span className='inline-flex items-center gap-1.5 mt-0.5 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5'>
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

      {helperText && <p className='text-xs text-gray-400 mt-1'>{helperText}</p>}
    </div>
  );
};

export default DeferredFilePicker;
