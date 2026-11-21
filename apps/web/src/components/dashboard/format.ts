// How the overview writes its figures, in Indian digit grouping.

const compactRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

// An amount shortened for a tile or an axis, such as ₹1.4Cr or ₹12.5K.
export const formatCompactRupees = (amount: number) =>
  compactRupees.format(amount);

// A count in full, such as 1,24,500.
export const formatCount = (value: number) => value.toLocaleString("en-IN");

// A count with what it counts, singular for one: "1 office", "12 offices".
export const formatCountOf = (
  value: number,
  singular: string,
  plural = `${singular}s`,
) => `${formatCount(value)} ${value === 1 ? singular : plural}`;

// A part as a whole-number share of its whole, such as 46%; 0% of nothing.
export const formatShare = (part: number, whole: number) =>
  `${whole > 0 ? Math.round((part / whole) * 100) : 0}%`;

// A month given as "2026-04", written "Apr 26", or "April 2026" in full.
export const formatMonth = (
  month: string,
  style: "short" | "long" = "short",
) => {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year!, monthIndex! - 1, 1).toLocaleDateString("en-IN", {
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "numeric" : "2-digit",
  });
};

// A day, such as 06 Dec 2026.
export const formatDay = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
