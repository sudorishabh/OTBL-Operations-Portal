import React from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { Segment } from "./segmented-bar";

// How the overview draws work orders by status: the portal's status
// colours, each with its icon, in one order everywhere.

type StatusCounts = { pending: number; completed: number; cancelled: number };

// The parts of a status bar, for SegmentedBar.
export const statusSegments = (counts: StatusCounts): Segment[] => [
  {
    key: "pending",
    label: "Pending",
    value: counts.pending,
    fillClassName: "bg-amber-500",
    textClassName: "text-gray-950",
    icon: Clock3,
    iconClassName: "text-amber-600",
  },
  {
    key: "completed",
    label: "Completed",
    value: counts.completed,
    fillClassName: "bg-emerald-600",
    textClassName: "text-white",
    icon: CheckCircle2,
    iconClassName: "text-emerald-600",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    value: counts.cancelled,
    fillClassName: "bg-rose-600",
    textClassName: "text-white",
    icon: XCircle,
    iconClassName: "text-rose-600",
  },
];

// The same split as a thin bar with no text, for a table row whose figures
// sit beside it.
export const StatusStripe = (counts: StatusCounts) => (
  <div
    aria-hidden='true'
    className='mt-1 flex h-1.5 w-full gap-0.5'>
    {statusSegments(counts)
      .filter((part) => part.value > 0)
      .map((part) => (
        <span
          key={part.key}
          className={`h-full rounded-full ${part.fillClassName}`}
          style={{ flexGrow: part.value, flexBasis: 0 }}
        />
      ))}
  </div>
);
