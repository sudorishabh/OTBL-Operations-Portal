import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ReceiptIndianRupee,
  MapPin,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Wallet,
} from "lucide-react";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";

interface ScheduleOfRate {
  id: number;
  activity: string;
  unit: string;
  estimated_quantity: string;
  rc_unit_rate: string;
  gst_percentage: string;
  unit_rate_inc_gst: string;
  total_cost: string;
  transportation_km?: string | null;
}

interface SiteCompletion {
  id: number;
  activity_name: string;
  estimated_quantity: string;
  amount: string;
  transportation_km?: string | null;
}

interface SiteWithCompletions {
  site: {
    name: string;
  };
  wo_site_id?: number;
  total_expenses?: string;
  expense_by_type?: Record<string, number>;
  expense_entry_count?: number;
  completions?: SiteCompletion[];
}

interface WorkOrderExpenseSummary {
  total_expenses: number;
  by_type: Record<string, number>;
  expense_entry_count: number;
  total_income: number;
  net_surplus: number;
}

interface Props {
  scheduleOfRates: ScheduleOfRate[];
  sites: SiteWithCompletions[];
  expenseSummary?: WorkOrderExpenseSummary | null;
}

const EXPENSE_TYPE_LABELS_SOR: Record<string, string> = {
  contractor_payment: "Contractor payment",
  labour: "Labour",
  material: "Material",
  equipment: "Equipment",
  miscellaneous: "Miscellaneous",
};

const SOR_ACTIVITY_TO_COMPLETION_ACTIVITY: Record<string, string> = {
  clean_soil_area: "clean_soil_area",
  lifting_oily_slush_or_recovery_of_oil: "lifting_oil_slush",
  excavation_oil_contaminated_soil: "excav_cont_soil",
  transportation_contaminated_soil: "trans_cont_soil",
  refilling_excavated_oil_contaminated_soil_land: "refill_excav_soil",
  bioremediation_oil_contaminated_soil: "biorem_cont_soil",
};

const formatCurrency = (amount: string | number) => {
  const val = Number(amount);
  if (isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);
};

const formatActivityName = (name: string) => {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const activityKey = (name: string) => {
  const v = (name || "").trim().toLowerCase();
  return v
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
};

const toNumberSafe = (val: unknown) => {
  const n =
    typeof val === "string"
      ? Number(val.replace(/,/g, "").trim())
      : Number(val);
  return Number.isFinite(n) ? n : 0;
};

const SiteSpendingCard = ({
  site,
  index,
}: {
  site: SiteWithCompletions;
  index: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expenseExpanded, setExpenseExpanded] = useState(false);
  const completions = site.completions || [];
  const hasCompletions = completions.length > 0;
  const expenseTotal = Number(site.total_expenses || 0);
  const expenseByType = site.expense_by_type || {};
  const expenseCount = site.expense_entry_count ?? 0;
  const hasExpenses = expenseTotal > 0 || expenseCount > 0;

  const siteTotal = completions.reduce(
    (acc, comp) => acc + Number(comp.amount || 0),
    0,
  );

  const siteHasData = hasCompletions || hasExpenses;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all duration-200 ${
        siteHasData
          ? "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
          : "border-slate-100 bg-slate-50/50"
      }`}>
      <button
        onClick={() => hasCompletions && setIsExpanded(!isExpanded)}
        disabled={!hasCompletions}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
          hasCompletions
            ? "cursor-pointer hover:bg-slate-50/80"
            : "cursor-default"
        }`}>
        <div className='flex items-center gap-3'>
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              siteHasData
                ? hasCompletions
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-400"
            }`}>
            {index + 1}
          </div>
          <div className='flex items-center gap-2'>
            <MapPin
              className={`w-3.5 h-3.5 ${siteHasData ? "text-slate-500" : "text-slate-300"}`}
            />
            <span
              className={`text-sm font-semibold ${siteHasData ? "text-gray-800" : "text-gray-400"}`}>
              {site.site.name}
            </span>
          </div>
          {hasCompletions && (
            <Badge
              variant='outline'
              className='bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium'>
              {completions.length}{" "}
              {completions.length === 1 ? "activity" : "activities"}
            </Badge>
          )}
          {hasExpenses && (
            <Badge
              variant='outline'
              className='bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-medium'>
              {expenseCount} expense{expenseCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {!siteHasData && (
            <span className='text-[10px] text-slate-400 italic'>
              No completion or expense data
            </span>
          )}
        </div>
        <div className='flex items-center gap-3'>
          {hasCompletions && (
            <span className='text-sm font-bold text-emerald-700'>
              {formatCurrency(siteTotal)}
            </span>
          )}
          {hasExpenses && hasCompletions && (
            <span className='text-[11px] font-semibold text-rose-600 whitespace-nowrap'>
              Exp {formatCurrency(expenseTotal)}
            </span>
          )}
          {hasExpenses && !hasCompletions && (
            <span className='text-sm font-bold text-rose-700'>
              {formatCurrency(expenseTotal)}
            </span>
          )}
          {hasCompletions &&
            (isExpanded ? (
              <ChevronDown className='w-4 h-4 text-slate-400' />
            ) : (
              <ChevronRight className='w-4 h-4 text-slate-400' />
            ))}
        </div>
      </button>

      {isExpanded && hasCompletions && (
        <div className='border-t border-slate-100'>
          <Table>
            <TableHeader>
              <TableRow className='bg-slate-50/80 hover:bg-slate-50/80'>
                <TableHead className='text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 pl-14'>
                  Activity
                </TableHead>
                <TableHead className='text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right py-2.5'>
                  Quantity
                </TableHead>
                <TableHead className='text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right py-2.5'>
                  Trans. Km
                </TableHead>
                <TableHead className='text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right py-2.5 pr-4'>
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completions.map((comp, idx) => (
                <TableRow
                  key={`${comp.id}-${idx}`}
                  className='hover:bg-emerald-50/30 transition-colors border-b border-slate-50 last:border-0'>
                  <TableCell className='py-2.5 pl-14 text-xs font-medium text-gray-700'>
                    {formatActivityName(comp.activity_name)}
                  </TableCell>
                  <TableCell className='py-2.5 text-right font-mono text-xs text-gray-600'>
                    {comp.estimated_quantity}
                  </TableCell>
                  <TableCell className='py-2.5 text-right font-mono text-xs text-gray-600'>
                    {comp.transportation_km ? (
                      <span>{comp.transportation_km} km</span>
                    ) : (
                      <span className='text-gray-300'>-</span>
                    )}
                  </TableCell>
                  <TableCell className='py-2.5 text-right font-semibold text-xs text-gray-800 pr-4'>
                    {formatCurrency(comp.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className='bg-emerald-50/40'>
              <TableRow className='hover:bg-emerald-50/40'>
                <TableCell
                  colSpan={3}
                  className='text-right text-xs font-bold text-emerald-800 py-2.5'>
                  Site Total
                </TableCell>
                <TableCell className='text-right text-xs font-bold text-emerald-700 pr-4 py-2.5'>
                  {formatCurrency(siteTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {hasExpenses && (
        <div className='border-t border-rose-100/80 bg-rose-50/20'>
          <button
            type='button'
            onClick={() => setExpenseExpanded(!expenseExpanded)}
            className='w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-rose-50/50 transition-colors'>
            <div className='flex items-center gap-2'>
              <ReceiptIndianRupee className='w-3.5 h-3.5 text-rose-500' />
              <span className='text-xs font-semibold text-rose-800'>
                Site expenses
              </span>
              {expenseCount > 0 && (
                <Badge
                  variant='outline'
                  className='text-[10px] bg-white text-rose-700 border-rose-200'>
                  {expenseCount} record{expenseCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold text-rose-700'>
                {formatCurrency(expenseTotal)}
              </span>
              {expenseExpanded ? (
                <ChevronDown className='w-4 h-4 text-rose-400' />
              ) : (
                <ChevronRight className='w-4 h-4 text-rose-400' />
              )}
            </div>
          </button>
          {expenseExpanded && Object.keys(expenseByType).length > 0 && (
            <div className='px-4 pb-3 pt-0'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-rose-50/60 hover:bg-rose-50/60'>
                    <TableHead className='text-[10px] font-semibold text-rose-700 uppercase py-2 pl-10'>
                      Category
                    </TableHead>
                    <TableHead className='text-[10px] font-semibold text-rose-700 uppercase text-right py-2 pr-4'>
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(expenseByType).map(([type, amt]) => (
                    <TableRow
                      key={type}
                      className='border-b border-rose-100/50 last:border-0'>
                      <TableCell className='py-2 pl-10 text-xs text-gray-700'>
                        {EXPENSE_TYPE_LABELS_SOR[type] ?? type}
                      </TableCell>
                      <TableCell className='py-2 text-right text-xs font-semibold text-rose-800 pr-4'>
                        {formatCurrency(amt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className='bg-rose-50/50'>
                  <TableRow>
                    <TableCell className='text-right text-xs font-bold text-rose-900 py-2'>
                      Expense total
                    </TableCell>
                    <TableCell className='text-right text-xs font-bold text-rose-800 pr-4 py-2'>
                      {formatCurrency(expenseTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ScheduleOfRatesTable = ({
  scheduleOfRates,
  sites,
  expenseSummary,
}: Props) => {
  const { getParam, deleteParam } = useHandleParams();
  const dialog = getParam("dialog");
  const isDialogOpen = dialog === "schedule-of-rates";

  const handleClose = () => {
    deleteParam("dialog");
  };

  if (!scheduleOfRates || scheduleOfRates.length === 0) {
    return null;
  }

  const grandTotal = scheduleOfRates.reduce(
    (acc, curr) => acc + Number(curr.total_cost || 0),
    0,
  );

  const usedQtyByActivity = (sites || []).reduce<Record<string, number>>(
    (acc, s) => {
      for (const c of s.completions || []) {
        const key = activityKey(c.activity_name);
        acc[key] = (acc[key] || 0) + toNumberSafe(c.estimated_quantity);
      }
      return acc;
    },
    {},
  );

  const totalSiteCompletions = sites?.reduce((acc: number, site) => {
    return (
      acc +
      (site.completions || []).reduce(
        (sAcc: number, comp: SiteCompletion) => sAcc + Number(comp.amount || 0),
        0,
      )
    );
  }, 0);

  const spendingPct =
    grandTotal > 0
      ? Math.min(100, (totalSiteCompletions / grandTotal) * 100)
      : 0;

  const sortedSites = [...(sites || [])].sort((a, b) => {
    const aHas =
      (a.completions || []).length > 0 ||
      Number(a.total_expenses || 0) > 0 ||
      (a.expense_entry_count ?? 0) > 0
        ? 0
        : 1;
    const bHas =
      (b.completions || []).length > 0 ||
      Number(b.total_expenses || 0) > 0 ||
      (b.expense_entry_count ?? 0) > 0
        ? 0
        : 1;
    return aHas - bHas;
  });

  const sitesWithData = sortedSites.filter(
    (s) =>
      (s.completions || []).length > 0 ||
      Number(s.total_expenses || 0) > 0 ||
      (s.expense_entry_count ?? 0) > 0,
  );

  return (
    <DialogWindow
      size='2xl'
      heightMode='fixed'
      title='View Schedule of Rates & Site Completion Data'
      open={isDialogOpen}
      setOpen={handleClose}>
      <div className='space-y-10 pb-10'>
        <section>
          <div className='flex items-center gap-2 mb-4 px-1'>
            <div className='p-2 bg-blue-50 rounded-lg'>
              <ReceiptIndianRupee className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <h3 className='text-lg font-bold text-gray-900'>
                Schedule of Rates (SOR)
              </h3>
              <p className='text-xs text-gray-500'>
                Approved rates and estimated quantities for the work order
              </p>
            </div>
          </div>
          <div className='overflow-hidden bg-white border-0 rounded-none'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50/50 hover:bg-gray-50/50 border-b'>
                  <TableHead className='font-semibold text-gray-700 py-4'>
                    Activity
                  </TableHead>
                  <TableHead className='font-semibold text-gray-700 text-center'>
                    Unit
                  </TableHead>
                  <TableHead className='font-semibold text-gray-700 text-right'>
                    Est. Qty
                  </TableHead>
                  <TableHead className='font-semibold text-gray-700 text-right'>
                    Used Qty
                  </TableHead>
                  <TableHead className='font-semibold text-gray-700 text-right'>
                    RC Rate
                  </TableHead>
                  <TableHead className='font-semibold text-gray-700 text-center'>
                    GST
                  </TableHead>
                  <TableHead className='font-semibold text-gray-700 text-right'>
                    Rate (Inc. GST)
                  </TableHead>
                  <TableHead className='font-semibold text-gray-700 text-right text-nowrap'>
                    Trans. Km
                  </TableHead>
                  <TableHead className='font-semibold text-gray-700 text-right'>
                    Total Cost
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleOfRates.map((item) => {
                  const completionActivity =
                    SOR_ACTIVITY_TO_COMPLETION_ACTIVITY[item.activity] ??
                    item.activity;
                  const usedQty =
                    usedQtyByActivity[activityKey(completionActivity)] ?? 0;

                  return (
                    <TableRow
                      key={item.id}
                      className='hover:bg-blue-50/30 transition-colors border-b last:border-0'>
                      <TableCell className='font-medium text-gray-800 p-4'>
                        {formatActivityName(item.activity)}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Badge
                          variant='outline'
                          className='bg-gray-100 text-gray-600 font-normal'>
                          {item.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right font-mono text-gray-600'>
                        {item.estimated_quantity}
                      </TableCell>
                      <TableCell className='text-right font-mono text-gray-600'>
                        {usedQty > 0 ? (
                          usedQty.toLocaleString("en-IN")
                        ) : (
                          <span className='text-gray-300'>0</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right font-mono text-gray-600'>
                        {formatCurrency(item.rc_unit_rate)}
                      </TableCell>
                      <TableCell className='text-center font-mono text-gray-600'>
                        {Number(item.gst_percentage)}%
                      </TableCell>
                      <TableCell className='text-right font-mono text-gray-600'>
                        {formatCurrency(item.unit_rate_inc_gst)}
                      </TableCell>
                      <TableCell className='text-right font-mono text-gray-600'>
                        {item.transportation_km ? (
                          <span>{item.transportation_km} km</span>
                        ) : (
                          <span className='text-gray-300'>-</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right font-semibold text-gray-800'>
                        {formatCurrency(item.total_cost)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className='bg-slate-50 border-t-2 border-slate-100'>
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className='text-right font-bold text-base text-gray-700 py-4'>
                    SOR Grand Total
                  </TableCell>
                  <TableCell className='text-right font-bold text-lg text-emerald-700'>
                    {formatCurrency(grandTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </section>

        {expenseSummary && (
          <section>
            <div className='flex items-center gap-2 mb-4 px-1'>
              <div className='p-2 bg-rose-50 rounded-lg'>
                <Wallet className='w-5 h-5 text-rose-600' />
              </div>
              <div>
                <h3 className='text-lg font-bold text-gray-900'>
                  Expenses &amp; profitability
                </h3>
                <p className='text-xs text-gray-500'>
                  Recorded costs across all sites vs SOR income
                </p>
              </div>
            </div>

            {(() => {
              const income = grandTotal;
              const expenses = Number(expenseSummary.total_expenses) || 0;
              const profit = income - expenses;
              const isProfit = profit >= 0;
              return (
            <div className='rounded-lg border border-rose-100 bg-linear-to-r from-rose-50/40 to-slate-50 p-4 mb-2'>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4'>
                <div>
                  <span className='text-[10px] uppercase tracking-wider text-slate-500 font-semibold block'>
                    Income (SOR total)
                  </span>
                  <p className='text-base font-bold text-emerald-700'>
                    {formatCurrency(income)}
                  </p>
                </div>
                <div>
                  <span className='text-[10px] uppercase tracking-wider text-slate-500 font-semibold block'>
                    Total expenses
                  </span>
                  <p className='text-base font-bold text-rose-700'>
                    {formatCurrency(expenses)}
                  </p>
                </div>
                <div>
                  <span className='text-[10px] uppercase tracking-wider text-slate-500 font-semibold block'>
                    {isProfit ? "Profit" : "Loss"}
                  </span>
                  <p
                    className={`text-base font-bold ${
                      isProfit ? "text-blue-700" : "text-orange-700"
                    }`}>
                    {formatCurrency(Math.abs(profit))}
                  </p>
                </div>
                <div>
                  <span className='text-[10px] uppercase tracking-wider text-slate-500 font-semibold block'>
                    Expense records
                  </span>
                  <p className='text-base font-bold text-slate-700'>
                    {expenseSummary.expense_entry_count}
                  </p>
                </div>
              </div>
              {Object.keys(expenseSummary.by_type).length > 0 && (
                <div>
                  <span className='text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-2'>
                    By category (work order)
                  </span>
                  <div className='flex flex-wrap gap-2'>
                    {Object.entries(expenseSummary.by_type).map(
                      ([type, amt]) => (
                        <Badge
                          key={type}
                          variant='outline'
                          className='text-[11px] bg-white border-rose-200 text-rose-800'>
                          {EXPENSE_TYPE_LABELS_SOR[type] ?? type}:{" "}
                          {formatCurrency(amt)}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
              );
            })()}
          </section>
        )}

        <section>
          <div className='flex items-center gap-2 mb-4 px-1'>
            <div className='p-2 bg-emerald-50 rounded-lg'>
              <TrendingUp className='w-5 h-5 text-emerald-600' />
            </div>
            <div>
              <h3 className='text-lg font-bold text-gray-900'>
                Site-wise Spending Breakdown
              </h3>
              <p className='text-xs text-gray-500'>
                Activity completion spendings and per-site expense totals
              </p>
            </div>
          </div>

          <div className='mb-5 rounded-lg border border-slate-200 bg-linear-to-r from-slate-50 to-emerald-50/30 p-4'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-4'>
                <div>
                  <span className='text-[10px] uppercase tracking-wider text-slate-500 font-semibold'>
                    Total Spent
                  </span>
                  <p className='text-lg font-bold text-emerald-700'>
                    {formatCurrency(totalSiteCompletions)}
                  </p>
                </div>
                <div className='h-8 w-px bg-slate-200' />
                <div>
                  <span className='text-[10px] uppercase tracking-wider text-slate-500 font-semibold'>
                    SOR Budget
                  </span>
                  <p className='text-lg font-bold text-slate-700'>
                    {formatCurrency(grandTotal)}
                  </p>
                </div>
              </div>
              <div className='text-right'>
                <span className='text-[10px] uppercase tracking-wider text-slate-500 font-semibold'>
                  Utilization
                </span>
                <p
                  className={`text-lg font-bold ${
                    spendingPct >= 100
                      ? "text-red-600"
                      : spendingPct >= 80
                        ? "text-amber-600"
                        : "text-emerald-600"
                  }`}>
                  {spendingPct.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className='h-2 bg-slate-200 rounded-full overflow-hidden'>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  spendingPct >= 100
                    ? "bg-red-500"
                    : spendingPct >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, spendingPct)}%` }}
              />
            </div>
            <div className='flex justify-between mt-1.5 text-[10px] text-slate-400'>
              <span>
                {sitesWithData.length} of {sortedSites.length} sites with
                completion data
              </span>
              <span>
                Remaining: {formatCurrency(grandTotal - totalSiteCompletions)}
              </span>
            </div>
          </div>

          {sortedSites.length > 0 ? (
            <div className='space-y-2'>
              {sortedSites.map((site, index) => (
                <SiteSpendingCard
                  key={`${site.site.name}-${index}`}
                  site={site}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className='text-center py-10 text-gray-400 italic text-sm border rounded-lg bg-slate-50/50'>
              No sites found for this work order.
            </div>
          )}

          {totalSiteCompletions > 0 && (
            <div className='mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between'>
              <span className='text-sm font-bold text-emerald-900'>
                Total Site Completion Amount
              </span>
              <span className='text-lg font-bold text-emerald-700'>
                {formatCurrency(totalSiteCompletions)}
              </span>
            </div>
          )}
        </section>
      </div>
    </DialogWindow>
  );
};

export default ScheduleOfRatesTable;
