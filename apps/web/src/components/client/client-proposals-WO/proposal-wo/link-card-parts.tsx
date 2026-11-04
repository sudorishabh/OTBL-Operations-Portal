import React from "react";
import { ChevronRight, FileText } from "lucide-react";
import DocumentsMenu from "@/components/shared/documents-menu";
import { type StoredDocument } from "@/lib/documents";

// The proposal and work order cards share the work order page's site card
// frame: the whole card opens the record, with a footer bar underneath.

export const LinkCard = ({
  label,
  onOpen,
  children,
}: {
  // Accessible name, e.g. "Open proposal X".
  label: string;
  onOpen: () => void;
  children: React.ReactNode;
}) => (
  <div
    role='button'
    tabIndex={0}
    aria-label={label}
    onClick={onOpen}
    onKeyDown={(e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    }}
    className='group flex h-full min-w-0 cursor-pointer flex-col rounded-lg border border-gray-200 bg-white outline-none transition-colors duration-200 hover:border-emerald-300 focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
    {children}
  </div>
);

// Title row with the open affordance on the right.
export const LinkCardHeader = ({
  title,
  aside,
  children,
}: {
  title: string;
  // Shown beside the title, e.g. a status pill.
  aside?: React.ReactNode;
  // The line under the title.
  children?: React.ReactNode;
}) => (
  <div className='flex items-start gap-3 px-4 pt-4'>
    <div className='min-w-0 flex-1'>
      <div className='flex items-center gap-2'>
        <h3
          className='truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-emerald-700'
          title={title}>
          {title}
        </h3>
        {aside}
      </div>
      {children && (
        <div className='mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500'>
          {children}
        </div>
      )}
    </div>
    <ChevronRight className='mt-0.5 size-4 shrink-0 text-gray-300 transition-colors group-hover:text-emerald-600' />
  </div>
);

export const LinkCardBody = ({ children }: { children: React.ReactNode }) => (
  <div className='flex-1 space-y-1.5 px-4 pb-4 pt-3 text-xs text-gray-600'>
    {children}
  </div>
);

export const LinkCardFooter = ({ children }: { children: React.ReactNode }) => (
  <div className='flex min-h-9 flex-wrap items-center gap-x-1.5 gap-y-1 rounded-b-lg border-t border-gray-100 bg-gray-50/60 px-4 py-2'>
    {children}
  </div>
);

// Opens the record's one document, or a menu of several.
export const DocumentsChip = ({
  documents,
}: {
  documents: StoredDocument[];
}) => (
  <DocumentsMenu
    documents={documents}
    align='start'>
    <button
      type='button'
      title={
        documents.length === 1
          ? "View document"
          : `View ${documents.length} documents`
      }
      className='inline-flex cursor-pointer items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
      <FileText className='size-3' />
      {documents.length === 1 ? "Document" : `${documents.length} documents`}
    </button>
  </DocumentsMenu>
);
