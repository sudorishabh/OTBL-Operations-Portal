import { differenceInCalendarDays, format } from "date-fns";

export type SiteStatus = "pending" | "completed" | "cancelled";

/** Colour is reserved for the two end states, so a list of live work reads calm. */
export const STATUS_STYLES: Record<SiteStatus, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
  pending: "bg-gray-100 text-gray-600",
};

export const toDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const statusOf = (status: string | null | undefined): SiteStatus =>
  status === "completed" || status === "cancelled" ? status : "pending";

export const isOpenStatus = (status: string | null | undefined) =>
  statusOf(status) === "pending";

export const formatDateRange = (
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
) => {
  const from = toDate(start);
  const to = toDate(end);
  if (!from && !to) return "Not scheduled";
  if (from && to) {
    const sameYear = from.getFullYear() === to.getFullYear();
    return `${format(from, sameYear ? "d MMM" : "d MMM yy")} – ${format(to, "d MMM yy")}`;
  }
  return format((from ?? to)!, "d MMM yy");
};

/** Plain-language urgency, only for sites that are still open. */
export const scheduleNote = (
  status: string | null | undefined,
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
) => {
  if (!isOpenStatus(status)) return null;

  const from = toDate(start);
  const to = toDate(end);
  const today = new Date();

  if (from && differenceInCalendarDays(from, today) > 0) {
    const days = differenceInCalendarDays(from, today);
    return {
      text: days === 1 ? "Starts tomorrow" : `Starts in ${days} days`,
      tone: "text-gray-500",
    };
  }

  if (!to) return null;
  const days = differenceInCalendarDays(to, today);
  if (days < 0)
    return {
      text: days === -1 ? "Ended yesterday" : `Ended ${Math.abs(days)} days ago`,
      tone: "text-rose-600",
    };
  if (days === 0) return { text: "Ends today", tone: "text-rose-600" };
  if (days === 1) return { text: "Ends tomorrow", tone: "text-amber-600" };
  if (days <= 5) return { text: `${days} days left`, tone: "text-amber-600" };
  return { text: `${days} days left`, tone: "text-gray-500" };
};
