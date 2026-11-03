"use client";
import React from "react";
import { constants } from "@pkg/utils";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const { JOB_ORDER_ACTIVITIES } = constants;

export type JobOrderActivityKey = (typeof JOB_ORDER_ACTIVITIES)[number]["key"];

// What is written against one activity row of the form.
export interface JobOrderActivityEntry {
  quantity: string;
  // As yyyy-MM-dd, or empty.
  completion_date: string;
}

export type JobOrderActivityEntries = Partial<
  Record<JobOrderActivityKey, JobOrderActivityEntry>
>;

// An activity row as it is saved, with only the rows something is written
// against.
export interface JobOrderActivityRow {
  key: JobOrderActivityKey;
  quantity: string;
  completion_date: string | null;
}

export const toActivityEntries = (
  rows: JobOrderActivityRow[] | null | undefined,
): JobOrderActivityEntries =>
  Object.fromEntries(
    (rows ?? []).map((row) => [
      row.key,
      { quantity: row.quantity, completion_date: row.completion_date ?? "" },
    ]),
  );

// Every row, in the form's order, to save.
export const toActivityRows = (
  entries: JobOrderActivityEntries,
): JobOrderActivityRow[] =>
  JOB_ORDER_ACTIVITIES.map(({ key }) => ({
    key,
    quantity: entries[key]?.quantity ?? "",
    completion_date: entries[key]?.completion_date || null,
  }));

interface Props {
  entries: JobOrderActivityEntries;
  onChange: (key: JobOrderActivityKey, entry: JobOrderActivityEntry) => void;
  // Whose wording the rows take: the job order form's, with the work due, or
  // the completion certificate's, with the work done.
  form?: "job_order" | "completion";
  disabled?: boolean;
}

const COLUMNS = {
  job_order: { quantity: "Quantity", date: "Completion date" },
  completion: { quantity: "Actual quantity", date: "Work completion date" },
};

const EMPTY_ENTRY: JobOrderActivityEntry = {
  quantity: "",
  completion_date: "",
};

// The activity table of the client's job order forms, with its rows in their
// order and a quantity and date to fill in against each.
const JobOrderActivitiesTable = ({
  entries,
  onChange,
  form = "job_order",
  disabled,
}: Props) => (
  <div className='overflow-x-auto rounded-lg border border-gray-200'>
    <table className='w-full min-w-[640px] text-xs'>
      <thead>
        <tr className='border-b border-gray-100 text-left text-[11px] text-gray-400'>
          <th className='px-3 py-2 font-medium'>Activity</th>
          <th className='w-24 px-3 py-2 font-medium'>Unit</th>
          <th className='w-44 px-2 py-2 font-medium'>
            {COLUMNS[form].quantity}
          </th>
          <th className='w-40 px-2 py-2 font-medium'>{COLUMNS[form].date}</th>
        </tr>
      </thead>
      <tbody className='divide-y divide-gray-100'>
        {JOB_ORDER_ACTIVITIES.map((activity) => {
          const entry = entries[activity.key] ?? EMPTY_ENTRY;
          const label =
            form === "completion" ? activity.completionLabel : activity.label;
          const unit =
            form === "completion" ? activity.completionUnit : activity.unit;
          return (
            <tr key={activity.key}>
              <td
                className={cn(
                  "px-3 py-1.5 leading-snug text-gray-700",
                  activity.indent && "pl-8 text-gray-500",
                )}>
                {label}
              </td>
              <td className='px-3 py-1.5 text-gray-500'>
                {unit || "Yes / No"}
              </td>
              <td className='px-2 py-1.5'>
                <Input
                  value={entry.quantity}
                  onChange={(e) =>
                    onChange(activity.key, {
                      ...entry,
                      quantity: e.target.value,
                    })
                  }
                  placeholder={unit ? "Quantity" : "Yes or No"}
                  aria-label={`${label} quantity`}
                  disabled={disabled}
                  className='h-8 text-xs'
                />
              </td>
              <td className='px-2 py-1.5'>
                <Input
                  type='date'
                  value={entry.completion_date}
                  onChange={(e) =>
                    onChange(activity.key, {
                      ...entry,
                      completion_date: e.target.value,
                    })
                  }
                  aria-label={`${label} date`}
                  disabled={disabled}
                  className='h-8 text-xs'
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default JobOrderActivitiesTable;
