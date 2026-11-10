import React, { useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentsMenu from "@/components/shared/documents-menu";
import { type StoredDocument } from "@/lib/documents";

const META_LINE =
  "mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500";

// One half of a proposal row: a title line, a meta line, and an optional
// line of details underneath. With `onOpen` the whole cell opens the record;
// without it the cell only shows, with room for an `action` on the right.
export const RowCell = ({
  label,
  onOpen,
  title,
  tooltip,
  aside,
  trailing,
  action,
  details,
  children,
}: {
  // Accessible name when the cell opens, e.g. "Open work order X".
  label?: string;
  onOpen?: () => void;
  title: string;
  // Shown when hovering the title; defaults to the title.
  tooltip?: string;
  // Beside the title, e.g. a status pill.
  aside?: React.ReactNode;
  // Far right of the title line, e.g. how many days are left.
  trailing?: React.ReactNode;
  // Far right of the cell when it doesn't open, e.g. a menu.
  action?: React.ReactNode;
  // A second line under the meta line.
  details?: React.ReactNode;
  // The meta line.
  children: React.ReactNode;
}) => (
  <div
    {...(onOpen && {
      role: "button",
      tabIndex: 0,
      "aria-label": label,
      onClick: onOpen,
      onKeyDown: (e: React.KeyboardEvent) => {
        // Leave keys pressed on a nested control, like the documents button.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      },
    })}
    className={cn(
      "group flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5",
      onOpen &&
        "cursor-pointer outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30",
    )}>
    <div className='min-w-0 flex-1'>
      <div className='flex min-w-0 items-start gap-2'>
        <span
          className={cn(
            "min-w-0 break-words text-sm font-medium text-gray-900",
            // A record that opens shows its full title on its own page.
            onOpen &&
              "line-clamp-2 transition-colors group-hover:text-emerald-700",
          )}
          title={tooltip ?? title}>
          {title}
        </span>
        {aside}
        {trailing && (
          <span className='ml-auto shrink-0 pl-2 text-xs leading-5'>
            {trailing}
          </span>
        )}
      </div>
      <div className={META_LINE}>{children}</div>
      {details && <div className={META_LINE}>{details}</div>}
    </div>
    {onOpen ? (
      <ChevronRight className='size-4 shrink-0 text-gray-300 transition-colors group-hover:text-emerald-600' />
    ) : (
      action && <div className='-mr-1 -mt-1 shrink-0 self-start'>{action}</div>
    )}
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

// A label and its value on the meta line, e.g. "Agreement AGR/23/678".
export const LabeledItem = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <span className='inline-flex min-w-0 items-baseline gap-1'>
    <span className='shrink-0 text-gray-400'>{label}</span>
    <span
      className='truncate font-medium text-gray-700'
      title={typeof children === "string" ? children : undefined}>
      {children}
    </span>
  </span>
);

// Text cut to two lines, with a toggle to read the rest when it's longer.
export const ClampedText = ({ text }: { text: string }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setIsClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className='w-full min-w-0'>
      <p
        ref={ref}
        className={cn(
          "whitespace-pre-line break-words leading-5 text-gray-600",
          !isExpanded && "line-clamp-2",
        )}>
        {text}
      </p>
      {(isClamped || isExpanded) && (
        <button
          type='button'
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          className='cursor-pointer font-medium text-emerald-700 hover:text-emerald-800 focus-visible:underline focus-visible:outline-none'>
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
};

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
