"use client";
import React from "react";
import {
  MapPin,
  ReceiptIndianRupee,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@pkg/utils";
import { StatTile } from "./stat-tile";
import { formatCompactRupees, formatCount, formatShare } from "./format";
import { useFinanceSummary, useWorkOrderSummary } from "./use-dashboard";

const NOT_LOADED = "Could not load";

// An amount shortened, with the full figure on hover.
const Rupees = ({ amount }: { amount: number }) => (
  <span title={formatCurrency(amount)}>{formatCompactRupees(amount)}</span>
);

// The overview's headline figures: work orders, sites still being worked,
// what the work is worth, what has been spent on it and what is left.
export const KpiStrip = () => {
  const summaryQuery = useWorkOrderSummary();
  const financeQuery = useFinanceSummary();
  const summary = summaryQuery.data;
  const finance = financeQuery.data;

  const income = summary?.sorTotal ?? 0;
  const spent = finance?.spent ?? 0;
  const sitesOpen = summary ? summary.sites.total - summary.sites.completed : 0;

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5'>
      <StatTile
        icon={ReceiptIndianRupee}
        label='Work orders'
        href='/dashboard/work-order'
        loading={summaryQuery.isPending}
        value={summary ? formatCount(summary.total) : "—"}
        hint={
          summary
            ? `${formatCount(summary.pending)} pending · ${formatCount(summary.completed)} completed`
            : summaryQuery.isError && NOT_LOADED
        }
      />
      <StatTile
        icon={MapPin}
        iconClassName='bg-sky-50 text-sky-700 ring-sky-100'
        label='Sites in progress'
        loading={summaryQuery.isPending}
        value={summary ? formatCount(sitesOpen) : "—"}
        hint={
          summary
            ? `${formatCount(summary.sites.completed)} of ${formatCount(summary.sites.total)} completed`
            : summaryQuery.isError && NOT_LOADED
        }
      />
      <StatTile
        icon={TrendingUp}
        iconClassName='bg-emerald-50 text-emerald-700 ring-emerald-100'
        label='Income (SOR total)'
        loading={summaryQuery.isPending}
        value={summary ? <Rupees amount={income} /> : "—"}
        hint={
          summary
            ? "Work orders not cancelled"
            : summaryQuery.isError && NOT_LOADED
        }
      />
      <StatTile
        icon={Wallet}
        iconClassName='bg-rose-50 text-rose-700 ring-rose-100'
        label='Expenses'
        loading={financeQuery.isPending}
        value={finance ? <Rupees amount={spent} /> : "—"}
        hint={
          finance
            ? `${formatCompactRupees(finance.thisMonth)} this month · ${formatCompactRupees(finance.lastMonth)} last`
            : financeQuery.isError && NOT_LOADED
        }
      />
      <StatTile
        icon={Scale}
        iconClassName='bg-violet-50 text-violet-700 ring-violet-100'
        label='Margin'
        loading={summaryQuery.isPending || financeQuery.isPending}
        value={summary && finance ? <Rupees amount={income - spent} /> : "—"}
        hint={
          summary && finance
            ? `${formatShare(spent, income)} of income spent`
            : (summaryQuery.isError || financeQuery.isError) && NOT_LOADED
        }
      />
    </div>
  );
};
