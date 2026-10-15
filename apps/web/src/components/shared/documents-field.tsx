"use client";
import React, { useRef } from "react";
import { X } from "lucide-react";
import { constants } from "@pkg/utils";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  documentName,
  openDocument,
  type StoredDocument,
} from "@/lib/documents";
import DeferredFilePicker, { getFileTypeStyle } from "./deferred-file-picker";

const { MAX_DOCUMENTS } = constants;

interface Props {
  label?: string;
  // Picked files that upload when the form is saved.
  files: File[];
  onFilesChange: (files: File[]) => void;
  // Documents already saved on the record (edit forms).
  existing?: StoredDocument[];
  onRemoveExisting?: (index: number) => void;
  allowedExtensions?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  isUploading?: boolean;
  progress?: number;
  className?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const FileRow = ({
  name,
  meta,
  onOpen,
  onRemove,
  removeLabel,
}: {
  name: string;
  meta: React.ReactNode;
  onOpen?: () => void;
  onRemove?: () => void;
  removeLabel: string;
}) => {
  const { Icon, bg, text } = getFileTypeStyle(name);

  return (
    <li className='flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2'>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          bg,
        )}>
        <Icon className={cn("size-4", text)} />
      </span>
      <div className='min-w-0 flex-1'>
        {onOpen ? (
          <button
            type='button'
            onClick={onOpen}
            title={name}
            className='block max-w-full cursor-pointer truncate text-left text-sm font-medium text-gray-700 hover:text-emerald-700 hover:underline'>
            {name}
          </button>
        ) : (
          <p
            className='truncate text-sm font-medium text-gray-700'
            title={name}>
            {name}
          </p>
        )}
        <p className='text-xs text-gray-400'>{meta}</p>
      </div>
      {onRemove && (
        <button
          type='button'
          onClick={onRemove}
          aria-label={removeLabel}
          title={removeLabel}
          className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500'>
          <X className='size-3.5' />
        </button>
      )}
    </li>
  );
};

// Multi-file document input for forms: saved documents plus files waiting
// to upload, together capped at maxFiles.
const DocumentsField = ({
  label = "Select documents",
  files,
  onFilesChange,
  existing = [],
  onRemoveExisting,
  allowedExtensions,
  maxSizeMB,
  maxFiles = MAX_DOCUMENTS,
  isUploading = false,
  progress = 0,
  className,
}: Props) => {
  // The picker reports a multi-file selection one file at a time.
  const filesRef = useRef(files);
  filesRef.current = files;

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    filesRef.current = [...filesRef.current, file];
    onFilesChange(filesRef.current);
  };

  const totalCount = existing.length + files.length;

  return (
    <div className={cn("space-y-2", className)}>
      {!isUploading && (
        <DeferredFilePicker
          label={label}
          selectedFile={null}
          onFileSelect={handleFileSelect}
          multiple
          maxFiles={maxFiles}
          fileCount={totalCount}
          allowedExtensions={allowedExtensions}
          maxSizeMB={maxSizeMB}
        />
      )}

      {totalCount > 0 && (
        <ul className='space-y-1.5'>
          {existing.map((doc, index) => (
            <FileRow
              key={`saved-${doc.url}-${index}`}
              name={documentName(doc, index)}
              meta='Saved'
              onOpen={() => openDocument(doc)}
              onRemove={
                onRemoveExisting && !isUploading
                  ? () => onRemoveExisting(index)
                  : undefined
              }
              removeLabel={`Remove ${documentName(doc, index)}`}
            />
          ))}
          {files.map((file, index) => (
            <FileRow
              key={`pending-${file.name}-${file.lastModified}-${index}`}
              name={file.name}
              meta={`${formatFileSize(file.size)}, uploads when you save`}
              onRemove={
                isUploading
                  ? undefined
                  : () => onFilesChange(files.filter((_, i) => i !== index))
              }
              removeLabel={`Remove ${file.name}`}
            />
          ))}
        </ul>
      )}

      {isUploading && (
        <div className='flex items-center gap-2'>
          <Progress
            value={progress}
            className='h-1.5 flex-1'
          />
          <span className='text-xs tabular-nums text-gray-500'>
            Uploading {progress}%
          </span>
        </div>
      )}

      {totalCount > 0 && (
        <p className='text-xs text-gray-400'>
          {totalCount} of {maxFiles} files
        </p>
      )}
    </div>
  );
};

export default DocumentsField;
