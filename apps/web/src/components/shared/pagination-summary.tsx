import { cn } from "@/lib/utils";

interface Props {
  /** Rows on screen so far. */
  shown: number;
  /** Rows matching the query; falls back to `shown` until it is known. */
  total?: number;
  /** Plural name of the rows, e.g. "users". */
  noun: string;
  /** The last loaded page. */
  page?: number;
  totalPages?: number;
  className?: string;
}

/** "Showing 10 of 42 users" with "Page 1 of 5" across from it, under a list. */
const PaginationSummary = ({
  shown,
  total,
  noun,
  page,
  totalPages = 0,
  className,
}: Props) => (
  <div
    className={cn(
      "flex justify-between items-center px-4 py-2 text-xs text-muted-foreground",
      className,
    )}>
    <span>
      Showing {shown} of {total || shown} {noun}
    </span>
    {page !== undefined && totalPages > 1 && (
      <span>
        Page {page} of {totalPages}
      </span>
    )}
  </div>
);

export default PaginationSummary;
