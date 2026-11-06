"use client";
import React, { useRef } from "react";
import { X } from "lucide-react";
import { constants } from "@pkg/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  // What a saved document's row says beside its name; "Saved" by default.
  existingMeta?: (index: number) => React.ReactNode;
  allowedExtensions?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  isUploading?: boolean;
  progress?: number;
  // The saved documents are still loading, so don't offer an empty picker.
  isLoading?: boolean;
  // Shown at the end of the add row, such as the button that uploads the
  // picked files.
  action?: React.ReactNode;
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
    <li className='flex items-center gap-2 px-2.5 py-1'>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded",
          bg,
        )}>
        <Icon className={cn("size-3", text)} />
      </span>
      <div className='min-w-0 flex-1'>
        {onOpen ? (
          <button
            type='button'
            onClick={onOpen}
            title={name}
            className='block max-w-full cursor-pointer truncate text-left text-xs font-medium text-gray-700 hover:text-emerald-700 hover:underline'>
            {name}
          </button>
        ) : (
          <p
            className='truncate text-xs font-medium text-gray-700'
            title={name}>
            {name}
          </p>
        )}
      </div>
      <span className='shrink-0 text-[11px] text-gray-400'>{meta}</span>
      {onRemove && (
        <button
          type='button'
          onClick={onRemove}
          aria-label={removeLabel}
          title={removeLabel}
          className='flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500'>
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
  existingMeta = () => "Saved",
  allowedExtensions,
  maxSizeMB,
  maxFiles = MAX_DOCUMENTS,
  isUploading = false,
  progress = 0,
  isLoading = false,
  action,
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
  const hasFiles = totalCount > 0;

  // Takes the picker's place while the files upload.
  const uploadingRow = (
    <div className='flex h-9 items-center gap-2 px-2.5'>
      <Progress
        value={progress}
        className='h-1 flex-1'
      />
      <span className='shrink-0 text-[11px] tabular-nums text-gray-500'>
        Uploading {progress}%
      </span>
    </div>
  );

  const picker = (
    <DeferredFilePicker
      label={hasFiles ? "Add files" : label}
      selectedFile={null}
      onFileSelect={handleFileSelect}
      multiple
      maxFiles={maxFiles}
      fileCount={totalCount}
      allowedExtensions={allowedExtensions}
      maxSizeMB={maxSizeMB}
      variant={hasFiles ? "row" : "zone"}
    />
  );

  // A saved file over the add row, the box most records end up with.
  if (isLoading && files.length === 0) {
    return (
      <div
        role='status'
        aria-busy='true'
        className={cn(
          "divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white",
          className,
        )}>
        <span className='sr-only'>Loading documents</span>
        {["w-36", "w-48"].map((width) => (
          <div
            key={width}
            aria-hidden='true'
            className='flex h-9 items-center gap-2 px-2.5'>
            <Skeleton className='size-5 shrink-0' />
            <Skeleton className={cn("h-3", width)} />
            <Skeleton className='ml-auto h-2.5 w-10' />
          </div>
        ))}
      </div>
    );
  }

  // Nothing picked or saved yet: just the one-line drop zone.
  if (!hasFiles) {
    return (
      <div className={className}>
        {isUploading ? (
          <div className='rounded-lg border border-gray-200 bg-white'>
            {uploadingRow}
          </div>
        ) : (
          picker
        )}
      </div>
    );
  }

  // The files, then a row to add more, in one box.
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-gray-200 bg-white",
        className,
      )}>
      <ul className='divide-y divide-gray-100'>
        {existing.map((doc, index) => (
          <FileRow
            key={`saved-${doc.url}-${index}`}
            name={documentName(doc, index)}
            meta={existingMeta(index)}
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
            meta={
              <>
                {formatFileSize(file.size)}
                <span
                  className='ml-2 text-amber-600'
                  title='Uploads when you save'>
                  Not saved
                </span>
              </>
            }
            onRemove={
              isUploading
                ? undefined
                : () => onFilesChange(files.filter((_, i) => i !== index))
            }
            removeLabel={`Remove ${file.name}`}
          />
        ))}
      </ul>
      <div className='flex items-center border-t border-gray-100'>
        <div className='min-w-0 flex-1'>
          {isUploading ? uploadingRow : picker}
        </div>
        {action && <div className='shrink-0 px-1.5'>{action}</div>}
      </div>
    </div>
  );
};

export default DocumentsField;
