// A work order's code, such as 2025-26(10)OTBL163: the financial year the
// work order starts in, its serial number within that year, then its serial
// number across all work orders.

// India Standard Time, which has no daylight saving. Dates are picked in
// India, so a date at midnight there must not slip into the day before on a
// server running in UTC.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// The financial year a date falls in, April to March, written "2025-26".
export const financialYearOf = (date: Date): string => {
  const inIndia = new Date(date.getTime() + IST_OFFSET_MS);
  const year = inIndia.getUTCFullYear();
  // getUTCMonth is zero based, so 3 is April.
  const startYear = inIndia.getUTCMonth() >= 3 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

export type WorkOrderCodeParts = {
  financialYear: string;
  // The work order's place among those starting in its financial year.
  fySerial: number;
  // Its place among all work orders.
  serial: number;
};

export const formatWorkOrderCode = ({
  financialYear,
  fySerial,
  serial,
}: WorkOrderCodeParts): string =>
  `${financialYear}(${fySerial})OTBL${serial}`;
