"use client";
import React from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { rateLabel } from "../contract-orders/contract-order-display";
import type { OrderItemOption } from "./add-expense-dialog";

// A requirement picked to record, with its total: the quantity its rate
// prices, or the amount of one without a rate.
export interface OrderItemLine {
  quantity: string;
  amount: string;
}

// The picked requirements, by id.
export type PickedOrderItems = Record<number, OrderItemLine>;

export const emptyOrderItemLine = (): OrderItemLine => ({
  quantity: "",
  amount: "",
});

// What a picked requirement costs: its quantity at its rate, or the amount
// entered for one without a rate. Null until it has one.
export const orderItemLineAmount = (
  item: OrderItemOption,
  line: OrderItemLine,
) => {
  const value =
    item.unitRate !== null
      ? (parseFloat(line.quantity) || 0) * item.unitRate
      : parseFloat(line.amount) || 0;
  return value > 0 ? value : null;
};

// What the picked requirements cost together.
export const pickedOrderItemsTotal = (
  items: OrderItemOption[],
  picked: PickedOrderItems,
) =>
  items.reduce((sum, item) => {
    const line = picked[item.id];
    return sum + (line ? (orderItemLineAmount(item, line) ?? 0) : 0);
  }, 0);

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

interface Props {
  items: OrderItemOption[];
  picked: PickedOrderItems;
  onChange: (picked: PickedOrderItems) => void;
}

// A single-expense sub-contract's requirements at the site, any of which are
// recorded together, each as its one expense with its total. One that has
// its expense already can't be picked.
const ExpenseOrderItemLines = ({ items, picked, onChange }: Props) => {
  const openItems = items.filter((item) => !item.isTaken);
  const pickedCount = Object.keys(picked).length;
  const allPicked = openItems.length > 0 && pickedCount === openItems.length;

  const toggle = (id: number) => {
    const next = { ...picked };
    if (next[id]) delete next[id];
    else next[id] = emptyOrderItemLine();
    onChange(next);
  };
  const update = (id: number, change: Partial<OrderItemLine>) =>
    onChange({ ...picked, [id]: { ...picked[id]!, ...change } });
  // Picking all keeps what was already entered.
  const toggleAll = () =>
    onChange(
      allPicked
        ? {}
        : Object.fromEntries(
            openItems.map((item) => [
              item.id,
              picked[item.id] ?? emptyOrderItemLine(),
            ]),
          ),
    );

  return (
    <div className='space-y-1.5'>
      <div className='flex items-end justify-between gap-3'>
        <Label className='text-xs font-medium text-gray-700'>
          Items <span className='text-red-500'>*</span>
        </Label>
        {openItems.length > 1 && (
          <button
            type='button'
            onClick={toggleAll}
            className='rounded-md px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50'>
            {allPicked ? "Clear" : "Select all"}
          </button>
        )}
      </div>

      <div className='divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200'>
        {items.map((item) => {
          const line = picked[item.id];
          const isPicked = !!line;
          const hasRate = item.unitRate !== null;
          const amount = line ? orderItemLineAmount(item, line) : null;

          return (
            <div
              key={item.id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_9.5rem_7rem]",
                isPicked && "bg-blue-50/40",
                item.isTaken && "bg-gray-50/70",
              )}>
              <label
                className={cn(
                  "col-span-2 flex min-w-0 items-center gap-2.5 sm:col-span-1",
                  item.isTaken ? "cursor-not-allowed" : "cursor-pointer",
                )}>
                <input
                  type='checkbox'
                  checked={isPicked}
                  disabled={item.isTaken}
                  onChange={() => toggle(item.id)}
                  className='peer sr-only'
                />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300",
                    isPicked
                      ? "border-blue-600 bg-blue-600 text-white"
                      : item.isTaken
                        ? "border-gray-200 bg-gray-100"
                        : "border-gray-300 bg-white",
                  )}>
                  {isPicked && (
                    <Check
                      className='size-3'
                      strokeWidth={3}
                    />
                  )}
                </span>
                <span className='min-w-0'>
                  <span
                    className={cn(
                      "block truncate text-sm",
                      item.isTaken
                        ? "text-gray-400"
                        : "font-medium text-gray-900",
                    )}>
                    {item.label}
                  </span>
                  <span className='block text-[11px] text-gray-400'>
                    {hasRate
                      ? rateLabel(item.unitRate!, item.unit)
                      : "No rate, so give its amount"}
                  </span>
                </span>
              </label>

              {item.isTaken ? (
                <span className='col-span-2 text-xs text-gray-400 sm:text-right'>
                  Its expense is recorded
                </span>
              ) : (
                <>
                  {hasRate ? (
                    <div className='relative'>
                      <Input
                        type='number'
                        min='0'
                        step='0.01'
                        aria-label={`${item.label} total quantity`}
                        placeholder={isPicked ? "Total" : ""}
                        value={line?.quantity ?? ""}
                        disabled={!isPicked}
                        onChange={(e) =>
                          update(item.id, { quantity: e.target.value })
                        }
                        className='h-9 bg-white pr-16 text-sm'
                      />
                      <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                        {item.unit}
                      </span>
                    </div>
                  ) : (
                    <div className='relative'>
                      <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>
                        ₹
                      </span>
                      <Input
                        type='number'
                        min='0'
                        step='0.01'
                        aria-label={`${item.label} amount`}
                        placeholder={isPicked ? "Amount" : ""}
                        value={line?.amount ?? ""}
                        disabled={!isPicked}
                        onChange={(e) =>
                          update(item.id, { amount: e.target.value })
                        }
                        className='h-9 bg-white pl-7 text-sm'
                      />
                    </div>
                  )}
                  <span
                    className={cn(
                      "text-right text-sm tabular-nums",
                      amount !== null
                        ? "font-medium text-gray-900"
                        : "text-gray-300",
                    )}>
                    {amount !== null ? formatAmount(amount) : "—"}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className='px-1 text-[11px] text-gray-400'>
        Each item takes one expense, so give its total. Those ticked are
        recorded together, each as its own expense.
      </p>
    </div>
  );
};

export default ExpenseOrderItemLines;
