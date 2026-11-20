"use client";
import React from "react";
import { TriangleAlert } from "lucide-react";
import { formatCurrency } from "@pkg/utils";
import {
  CARD_ERROR,
  CardMessage,
  CardSkeleton,
  DashboardCard,
} from "./dashboard-card";
import { RankedBars, type RankedBar } from "./ranked-bars";
import { formatCompactRupees, formatCountOf, formatShare } from "./format";
import { processLabel, sourceLabel } from "./labels";
import { useFinanceSummary } from "./use-dashboard";

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h3 className='mb-2 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase'>
    {children}
  </h3>
);

const largestFirst = (rows: RankedBar[]) =>
  [...rows].sort((a, b) => b.value - a.value);

// Where the money went: what it was spent through and on which process,
// and how much went over the estimates.
export const SpendingCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useFinanceSummary();

  return (
    <DashboardCard
      className={className}
      title='Spending breakdown'
      description={
        data
          ? `${formatCompactRupees(data.spent)} across ${formatCountOf(data.count, "expense")}`
          : "All expenses"
      }>
      {isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading the spending breakdown'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.count === 0 ? (
        <CardMessage>No expenses recorded yet.</CardMessage>
      ) : (
        <div className='space-y-4 px-4 py-4'>
          <div>
            <Heading>By what it was spent through</Heading>
            <RankedBars
              title='Expenses by what they were spent through'
              formatValue={formatCompactRupees}
              rows={largestFirst(
                data.sources.map((source) => ({
                  key: source.source,
                  label: sourceLabel(source.source),
                  note: formatCountOf(source.count, "expense"),
                  value: source.total,
                })),
              )}
            />
          </div>

          <div>
            <Heading>By process</Heading>
            <RankedBars
              title='Expenses by process'
              formatValue={formatCompactRupees}
              rows={largestFirst(
                Object.entries(data.byProcess).map(([process, total]) => ({
                  key: process,
                  label: processLabel(process),
                  value: total,
                })),
              )}
            />
          </div>

          <p
            className='flex items-start gap-1.5 rounded-lg bg-gray-50 px-2.5 py-2 text-[12px] text-gray-600'
            title={formatCurrency(data.exceeded)}>
            <TriangleAlert
              aria-hidden='true'
              className='mt-0.5 size-3.5 shrink-0 text-amber-600'
            />
            <span>
              <span className='font-semibold text-gray-900'>
                {formatCompactRupees(data.exceeded)}
              </span>{" "}
              spent over the estimates ({formatShare(data.exceeded, data.spent)}{" "}
              of all expenses)
            </span>
          </p>
        </div>
      )}
    </DashboardCard>
  );
};
