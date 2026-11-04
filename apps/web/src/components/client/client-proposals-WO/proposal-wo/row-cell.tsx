import React from "react";
import { ChevronRight, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentsMenu from "@/components/shared/documents-menu";
import { type StoredDocument } from "@/lib/documents";

// One half of a proposal row: a title line and a meta line underneath.
// The whole cell opens the record.
export const RowCell = ({
  label,
  onOpen,
  title,
  tooltip,
  aside,
  trailing,
  children,
}: {
  // Accessible name, e.g. "Open proposal X".
  label: string;
  onOpen: () => void;
  title: string;
  // Shown when hovering the title; defaults to the title.
  tooltip?: string;
  // Beside the title, e.g. a status pill.
  aside?: React.ReactNode;
  // Far right of the title line, e.g. how many days are left.
  trailing?: React.ReactNode;
  // The meta line.
  children: React.ReactNode;
}) => (
  <div
    role='button'
    tabIndex={0}
    aria-label={label}
    onClick={onOpen}
    onKeyDown={(e) => {
      // Leave keys pressed on a nested control, like the documents button.
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    }}
    className='group flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
    <div className='min-w-0 flex-1'>
      <div className='flex min-w-0 items-center gap-2'>
        <span
          className='truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-emerald-700'
          title={tooltip ?? title}>
          {title}
        </span>
        {aside}
        {trailing && (
          <span className='ml-auto shrink-0 pl-2 text-xs'>{trailing}</span>
        )}
      </div>
      <div className='mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500'>
        {children}
      </div>
    </div>
    <ChevronRight className='size-4 shrink-0 text-gray-300 transition-colors group-hover:text-emerald-600' />
  </div>
);

// An icon and text on the meta line.
export const MetaItem = ({
  Icon,
  className,
  title,
  children,
}: {
  Icon: React.ElementType;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) => (
  <span
    className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
    title={title}>
    <Icon className='size-3.5 shrink-0 text-gray-400' />
    <span className='truncate'>{children}</span>
  </span>
);

// A paperclip with the document count; opens the one document, or a menu.
export const DocumentsCount = ({
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
      className='inline-flex cursor-pointer items-center gap-1 rounded px-1 font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
      <Paperclip className='size-3.5' />
      {documents.length}
    </button>
  </DocumentsMenu>
);
