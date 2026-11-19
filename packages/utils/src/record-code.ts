// The codes records are known by, such as USR-0007 or VEN-0012: a prefix for
// the kind of record, then its number, padded to four digits. They tell apart
// records with similar names and make them quick to find. Purchase orders and
// sub-contracts are numbered apart, as PO-0003 and SC-0003.
export const CODE_PREFIX = {
  USER: "USR",
  OFFICE: "OFF",
  SITE: "SITE",
  CLIENT: "CLT",
  MAIN_CLIENT: "MCL",
  VENDOR: "VEN",
  PURCHASE_ORDER: "PO",
  SUB_CONTRACT: "SC",
} as const;

export type CodePrefix = (typeof CODE_PREFIX)[keyof typeof CODE_PREFIX];

export const formatCode = (prefix: CodePrefix, serial: number): string =>
  `${prefix}-${String(serial).padStart(4, "0")}`;

// A code typed short, such as "VEN-12", "ven12" or just "12", read as the
// full code, VEN-0012. Null when the search isn't a code.
export const typedCode = (
  prefix: CodePrefix,
  search: string,
): string | null => {
  const match = search
    .trim()
    .match(new RegExp(`^(?:${prefix})?[\\s-]*0*(\\d+)$`, "i"));
  return match ? formatCode(prefix, Number(match[1])) : null;
};
