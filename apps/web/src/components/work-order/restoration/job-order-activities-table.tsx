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

interface Props {
  entries: JobOrderActivityEntries;
  onChange: (key: JobOrderActivityKey, entry: JobOrderActivityEntry) => void;
}

const EMPTY_ENTRY: JobOrderActivityEntry = {
  quantity: "",
  completion_date: "",
};

// The job order form's activity table, with the client's rows in their order
// and a quantity and completion date to fill in against each.
const JobOrderActivitiesTable = ({ entries, onChange }: Props) => (
  <div className='overflow-x-auto rounded-lg border border-gray-200'>
    <table className='w-full min-w-[640px] text-xs'>
      <thead>
        <tr className='border-b border-gray-100 text-left text-[11px] text-gray-400'>
          <th className='px-3 py-2 font-medium'>Activity</th>
          <th className='w-24 px-3 py-2 font-medium'>Unit</th>
          <th className='w-44 px-2 py-2 font-medium'>Quantity</th>
          <th className='w-40 px-2 py-2 font-medium'>Completion date</th>
        </tr>
      </thead>
      <tbody className='divide-y divide-gray-100'>
        {JOB_ORDER_ACTIVITIES.map((activity) => {
          const entry = entries[activity.key] ?? EMPTY_ENTRY;
          return (
            <tr key={activity.key}>
              <td
                className={cn(
                  "px-3 py-1.5 leading-snug text-gray-700",
                  activity.indent && "pl-8 text-gray-500",
                )}>
                {activity.label}
              </td>
              <td className='px-3 py-1.5 text-gray-500'>
                {activity.unit || "Yes / No"}
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
                  placeholder={activity.unit ? "Quantity" : "Yes or No"}
                  aria-label={`${activity.label} quantity`}
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
                  aria-label={`${activity.label} completion date`}
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
