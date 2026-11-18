"use client";
import React from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActivityOption } from "./add-expense-dialog";

// One activity of an expense recorded with others, as its own expense.
export interface ActivityLine {
  // Stable React key.
  key: string;
  activityKey: string;
  quantity: string;
  amount: string;
}

export const newActivityLine = (): ActivityLine => ({
  key: crypto.randomUUID(),
  activityKey: "",
  quantity: "",
  amount: "",
});

// What is left of an activity's estimated quantity, or null when it has none.
export const remainingQuantity = (
  activity: ActivityOption | undefined,
  usedQtyByActivity: Record<string, number>,
) =>
  activity?.estimateQty != null
    ? Math.max(0, activity.estimateQty - (usedQtyByActivity[activity.key] ?? 0))
    : null;

export const formatQty = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

interface Props {
  lines: ActivityLine[];
  onChange: (lines: ActivityLine[]) => void;
  activities: ActivityOption[];
  usedQtyByActivity: Record<string, number>;
  // Why the activities are the ones offered.
  note?: string;
}

// Several activities, each with its quantity and amount, recorded together.
// An activity can be on one line only.
const ExpenseActivityLines = ({
  lines,
  onChange,
  activities,
  usedQtyByActivity,
  note,
}: Props) => {
  const update = (key: string, change: Partial<ActivityLine>) =>
    onChange(
      lines.map((line) => (line.key === key ? { ...line, ...change } : line)),
    );
  const remove = (key: string) =>
    onChange(lines.filter((line) => line.key !== key));

  const picked = new Set(lines.map((line) => line.activityKey));
  const total = lines.reduce(
    (sum, line) => sum + (parseFloat(line.amount) || 0),
    0,
  );

  return (
    <div className='space-y-1.5'>
      <div className='flex items-end justify-between gap-3'>
        <Label className='text-xs font-medium text-gray-700'>
          Activities <span className='text-red-500'>*</span>
        </Label>
        <button
          type='button'
          disabled={lines.length >= activities.length}
          onClick={() => onChange([...lines, newActivityLine()])}
          className='inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-40'>
          <Plus className='size-3.5' />
          Add activity
        </button>
      </div>

      <div className='space-y-2'>
        {lines.map((line) => {
          const activity = activities.find((a) => a.key === line.activityKey);
          const unit = activity?.unit ?? "Nos";
          const remaining = remainingQuantity(activity, usedQtyByActivity);
          const isUsedUp = remaining !== null && remaining <= 0;
          const isOver =
            !isUsedUp &&
            remaining !== null &&
            (parseFloat(line.quantity) || 0) > remaining;

          return (
            <div
              key={line.key}
              className={cn(
                "rounded-lg border bg-gray-50/50 p-2",
                isUsedUp ? "border-orange-200" : "border-gray-200",
              )}>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_2rem]'>
                <Select
                  value={line.activityKey}
                  disabled={activities.length === 0}
                  onValueChange={(activityKey) =>
                    update(line.key, { activityKey, quantity: "" })
                  }>
                  <SelectTrigger
                    aria-label='Activity'
                    className='h-9 w-full bg-white text-sm'>
                    <SelectValue
                      placeholder={
                        activities.length === 0
                          ? "No activities to choose"
                          : "Activity"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map((option) => (
                      <SelectItem
                        key={option.key}
                        value={option.key}
                        disabled={
                          picked.has(option.key) &&
                          option.key !== line.activityKey
                        }
                        className='text-sm'>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className='relative'>
                  <Input
                    type='number'
                    min='0'
                    step='0.01'
                    aria-label='Quantity'
                    placeholder={line.activityKey ? "Qty" : "Pick activity"}
                    value={line.quantity}
                    disabled={!line.activityKey}
                    onChange={(e) =>
                      update(line.key, { quantity: e.target.value })
                    }
                    aria-invalid={isOver || undefined}
                    className='h-9 bg-white pr-12 text-sm'
                  />
                  {line.activityKey && (
                    <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                      {unit}
                    </span>
                  )}
                </div>

                <div className='relative'>
                  <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>
                    ₹
                  </span>
                  <Input
                    type='number'
                    min='0'
                    step='0.01'
                    aria-label='Amount'
                    placeholder='Amount'
                    value={line.amount}
                    onChange={(e) =>
                      update(line.key, { amount: e.target.value })
                    }
                    className='h-9 bg-white pl-7 text-sm'
                  />
                </div>

                <button
                  type='button'
                  title='Remove activity'
                  aria-label='Remove activity'
                  disabled={lines.length === 1}
                  onClick={() => remove(line.key)}
                  className='flex h-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30'>
                  <Trash2 className='size-4' />
                </button>
              </div>

              {activity && remaining !== null && (
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 px-1 text-[11px]",
                    isUsedUp
                      ? "text-orange-600"
                      : isOver
                        ? "text-red-600"
                        : "text-gray-500",
                  )}>
                  {isUsedUp && <AlertTriangle className='size-3 shrink-0' />}
                  {isUsedUp
                    ? `Its estimated ${formatQty(activity.estimateQty!)} ${unit} is used up, so this is recorded as exceeded.`
                    : isOver
                      ? `Only ${formatQty(remaining)} ${unit} left on this activity.`
                      : `${formatQty(remaining)} of ${formatQty(activity.estimateQty!)} ${unit} left on this activity.`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className='flex items-start justify-between gap-3 px-1'>
        <p className='text-[11px] text-gray-400'>{note}</p>
        <p className='shrink-0 text-xs text-gray-500'>
          Total{" "}
          <span className='font-semibold tabular-nums text-gray-900'>
            {formatAmount(total)}
          </span>
        </p>
      </div>
    </div>
  );
};

export default ExpenseActivityLines;
