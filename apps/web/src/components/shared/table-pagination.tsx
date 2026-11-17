import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PageItem = number | "gap";

// The page numbers to show: the first and last pages, and the pages around
// the current one, with gaps for the rest.
export const pageItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const shown = new Set([1, totalPages, page - 1, page, page + 1]);
  // Near either end, show enough pages that the row keeps its length.
  if (page <= 3) [2, 3, 4].forEach((value) => shown.add(value));
  if (page >= totalPages - 2) {
    [totalPages - 3, totalPages - 2, totalPages - 1].forEach((value) =>
      shown.add(value),
    );
  }

  const pages = [...shown]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && value - previous === 2) {
      // A gap of one page shows that page rather than "…".
      items.push(previous + 1);
    } else if (previous !== undefined && value - previous > 2) {
      items.push("gap");
    }
    items.push(value);
  });
  return items;
};

// Scrolls a list back into view when its top has scrolled above the screen,
// such as after moving to another page from the controls under it.
export const scrollIntoViewIfAbove = (element: HTMLElement | null) => {
  if (element && element.getBoundingClientRect().top < 0) {
    element.scrollIntoView({ block: "start", behavior: "smooth" });
  }
};

const PageButton = ({
  isCurrent = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isCurrent?: boolean }) => (
  <button
    type='button'
    aria-current={isCurrent ? "page" : undefined}
    className={cn(
      "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border px-2 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40",
      isCurrent
        ? "border-emerald-600 bg-emerald-600 text-white"
        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:hover:bg-white",
      className,
    )}
    {...props}
  />
);

interface Props {
  page: number;
  pageSize: number;
  /** Rows matching the query across every page. */
  total: number;
  /** Plural name of the rows, e.g. "sites". */
  noun: string;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * "Showing 11–20 of 42 sites" under a list, with previous, next and page
 * number buttons when there is more than one page. Phones get previous and
 * next around "Page 2 of 5".
 */
const TablePagination = ({
  page,
  pageSize,
  total,
  noun,
  onPageChange,
  className,
}: Props) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-xs text-gray-500",
        className,
      )}>
      <span>
        Showing{" "}
        <span className='font-medium tabular-nums text-gray-700'>
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className='font-medium tabular-nums text-gray-700'>{total}</span>{" "}
        {noun}
      </span>

      {totalPages > 1 && (
        <nav
          aria-label={`Pages of ${noun}`}
          className='flex items-center gap-1'>
          <PageButton
            aria-label='Previous page'
            title='Previous page'
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className='size-3.5' />
          </PageButton>

          <span className='px-2 tabular-nums sm:hidden'>
            Page {page} of {totalPages}
          </span>
          <div className='hidden items-center gap-1 sm:flex'>
            {pageItems(page, totalPages).map((item, index) =>
              item === "gap" ? (
                <span
                  key={`gap-${index}`}
                  aria-hidden='true'
                  className='px-1 text-gray-400'>
                  …
                </span>
              ) : (
                <PageButton
                  key={item}
                  isCurrent={item === page}
                  aria-label={`Page ${item}`}
                  onClick={() => onPageChange(item)}>
                  {item}
                </PageButton>
              ),
            )}
          </div>

          <PageButton
            aria-label='Next page'
            title='Next page'
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}>
            <ChevronRight className='size-3.5' />
          </PageButton>
        </nav>
      )}
    </div>
  );
};

export default TablePagination;
