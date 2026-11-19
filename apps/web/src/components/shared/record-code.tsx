import React from "react";
import { cn } from "@/lib/utils";

// A record's code, such as VEN-0012 or USR-0007, set apart from its name so
// records with similar names can be told apart at a glance.
const RecordCode = ({
  code,
  className,
}: {
  code: string;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[11px] font-medium leading-4 text-gray-600",
      className,
    )}>
    {code}
  </span>
);

export default RecordCode;
