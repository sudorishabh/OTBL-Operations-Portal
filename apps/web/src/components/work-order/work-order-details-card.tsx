import React, { useState } from "react";
import { format } from "date-fns";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  Ban,
} from "lucide-react";
import { capitalFirstLetter, constants, formatCurrency } from "@pkg/utils";
import { cn } from "@/lib/utils";
import DocumentsMenu from "@/components/shared/documents-menu";
import { toDocuments } from "@/lib/documents";
import { useIsAdmin } from "@/contexts/AuthContext";
import EditWorkOrderDialog from "./edit-work-order-dialog";

interface Props {
  workOrder: {
    id: number;
    code: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    process_type?: string | null;
    rate_contract_number?: string | null;
    documents?: unknown;
    agreement_number?: string | null;
    job_number?: string | null;
    joint_estimate_number?: string | null;
    area?: string | null;
    installation_type?: string | null;
    land_owner_name?: string | null;
    remarks?: string | null;
    status: "pending" | "completed" | "cancelled";
    cancellation_reason: string | null;
    created_at: string;
    updated_at: string;
    office_id: number;
    office_name: string | null;
    is_approved?: boolean;
    approved_by_name?: string | null;
  };
  stats: {
    totalSites: number;
    completedSites: number;
    totalBudgetAmount: number;
    totalCompletionAmount: number;
    budgetUtilization: number;
    totalExpenses?: number;
    expenseEntryCount?: number;
    netSurplus?: number;
  };
  expenseSummary?: {
    total_expenses: number;
    exceeded_total?: number;
    regular_total?: number;
    expense_entry_count: number;
    total_income: number;
    net_surplus: number;
  } | null;
}

const STATUS_STYLES: Record<Props["workOrder"]["status"], string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
};

const PROCESS_STYLES: Record<string, string> = {
  [constants.WO_PROCESS.BIOREMEDIATION]: "bg-blue-50 text-blue-700 ring-blue-200",
  [constants.WO_PROCESS.RESTORATION]: "bg-purple-50 text-purple-700 ring-purple-200",
  [constants.WO_PROCESS.BIOREMEDIATION_RESTORATION]:
    "bg-orange-50 text-orange-700 ring-orange-200",
};

// A small outlined pill, as the process sections use for status.
const Pill = ({
  className,
  title,
  children,
}: {
  className: string;
  title?: string;
  children: React.ReactNode;
}) => (
  <span
    title={title}
    className={cn(
      "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
      className,
    )}>
    {children}
  </span>
);

const Empty = () => <span className='text-gray-300'>&mdash;</span>;

// Dense label/value pair used across the detail grid.
const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div className='min-w-0'>
    <div className='text-xs text-gray-500'>{label}</div>
    <p
      className='mt-0.5 truncate text-[13px] font-medium text-gray-800'
      title={value || undefined}>
      {value || <Empty />}
    </p>
  </div>
);

// Metric tile: headline figure with a qualifier underneath.
const Metric = ({
  label,
  value,
  hint,
  valueClass = "text-gray-900",
  hintClass = "text-gray-400",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  valueClass?: string;
  hintClass?: string;
}) => (
  <div className='min-w-0 px-6 py-3'>
    <div className='text-xs text-gray-500'>{label}</div>
    <div
      className={cn(
        "mt-0.5 truncate text-sm font-semibold tabular-nums leading-tight",
        valueClass,
      )}>
      {value}
    </div>
    {/* Fixed height keeps tiles aligned when a metric has no qualifier. */}
    <div className={cn("h-4 truncate text-[11px] leading-4", hintClass)}>
      {hint}
    </div>
  </div>
);

const WorkOrderDetailsCard = ({ workOrder, stats, expenseSummary }: Props) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const isAdmin = useIsAdmin();

  const income = Number(stats.totalBudgetAmount) || 0;
  const activitySpending = Number(stats.totalCompletionAmount) || 0;
  const activityUsedPct = income > 0 ? (activitySpending / income) * 100 : 0;
  const expenses = Number(
    expenseSummary?.total_expenses ?? stats.totalExpenses ?? 0,
  );
  const exceededExpenses = Number(expenseSummary?.exceeded_total ?? 0);
  const profit = income - expenses;
  const isProfit = profit >= 0;
  const profitMargin = income > 0 ? (profit / income) * 100 : 0;
  const expenseRecords =
    expenseSummary?.expense_entry_count ?? stats.expenseEntryCount ?? 0;

  const startDate =
    workOrder.start_date && !isNaN(new Date(workOrder.start_date).getTime())
      ? format(new Date(workOrder.start_date), "MMM dd, yyyy")
      : "N/A";

  const documents = toDocuments(workOrder.documents);
  const processLabel =
    constants.processTypeOptions.find(
      (opt) => opt.value === workOrder.process_type,
    )?.label ||
    workOrder.process_type ||
    "N/A";

  const recordsLabel = `${Number(expenseRecords).toLocaleString("en-IN")} records`;
  const hasNotes = !!(workOrder.description || workOrder.remarks);

  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
      {/* Identity */}
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5'>
        <div className='flex min-w-0 items-center gap-3'>
          <div className='shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100'>
            <FileText className='size-4' />
          </div>
          <div className='min-w-0'>
            <h2
              className='truncate text-base font-semibold text-gray-900'
              title={workOrder.title}>
              {capitalFirstLetter(workOrder.title)}
            </h2>
            <div className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500'>
              <span className='font-mono font-medium text-gray-700'>
                {workOrder.code.toUpperCase()}
              </span>
              <span className='inline-flex min-w-0 items-center gap-1.5'>
                <Building2 className='size-3.5 shrink-0 text-gray-400' />
                <span className='truncate'>
                  {workOrder.office_name || <Empty />}
                </span>
              </span>
              <span className='inline-flex items-center gap-1.5'>
                <CalendarDays className='size-3.5 shrink-0 text-gray-400' />
                {startDate}
              </span>
            </div>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-1.5'>
          {workOrder.status !== "cancelled" &&
            (workOrder.is_approved ? (
              <Pill
                className='bg-emerald-50 text-emerald-700 ring-emerald-200'
                title={
                  workOrder.approved_by_name
                    ? `Approved by ${workOrder.approved_by_name}`
                    : "Approved"
                }>
                Approved
              </Pill>
            ) : (
              <Pill
                className='bg-amber-50 text-amber-700 ring-amber-200'
                title='Draft, awaiting approval'>
                Draft
              </Pill>
            ))}
          <Pill className={STATUS_STYLES[workOrder.status]}>
            {capitalFirstLetter(workOrder.status)}
          </Pill>
          {workOrder.process_type && (
            <Pill
              className={
                PROCESS_STYLES[workOrder.process_type] ??
                "bg-gray-50 text-gray-700 ring-gray-200"
              }>
              {processLabel}
            </Pill>
          )}
          <DocumentsMenu
            documents={documents}
            align='start'>
            <button
              type='button'
              title='View work order documents'
              className='inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
              <ExternalLink className='size-3' />
              {documents.length === 1
                ? "Document"
                : `${documents.length} documents`}
            </button>
          </DocumentsMenu>
          {isAdmin && <EditWorkOrderDialog workOrder={workOrder} />}
        </div>
      </div>

      {/* Metrics */}
      <div className='grid grid-cols-2 divide-x divide-y divide-gray-200 border-y border-gray-200 bg-gray-50/60 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0'>
        <Metric
          label='Sites'
          value={
            <>
              {Number(stats.completedSites).toLocaleString("en-IN")}
              <span className='font-normal text-gray-400'>
                {" / "}
                {Number(stats.totalSites).toLocaleString("en-IN")}
              </span>
            </>
          }
          hint='completed'
        />
        <Metric
          label='Income'
          value={formatCurrency(income)}
          hint='total budget'
        />
        <Metric
          label='Activity spend'
          value={formatCurrency(activitySpending)}
          hint={`${activityUsedPct.toFixed(1)}% of income`}
        />
        <Metric
          label='Expenses'
          value={formatCurrency(expenses)}
          valueClass='text-rose-700'
          hint={
            exceededExpenses > 0
              ? `${formatCurrency(exceededExpenses)} exceeded · ${recordsLabel}`
              : recordsLabel
          }
          hintClass={exceededExpenses > 0 ? "text-orange-600" : "text-gray-400"}
        />
        <Metric
          label={isProfit ? "Profit" : "Loss"}
          value={formatCurrency(Math.abs(profit))}
          valueClass={isProfit ? "text-emerald-700" : "text-rose-700"}
          hint={`${profitMargin.toFixed(1)}% margin`}
          hintClass={isProfit ? "text-emerald-600/70" : "text-rose-600/70"}
        />
      </div>

      {/* Details */}
      <div className='grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-4 sm:grid-cols-4 xl:grid-cols-7'>
        <Field
          label='Agreement'
          value={workOrder.agreement_number?.toUpperCase()}
        />
        <Field
          label='Rate contract'
          value={workOrder.rate_contract_number?.toUpperCase()}
        />
        <Field
          label='Job no.'
          value={workOrder.job_number?.toUpperCase()}
        />
        <Field
          label='Joint estimate'
          value={workOrder.joint_estimate_number?.toUpperCase()}
        />
        <Field
          label='Area'
          value={workOrder.area && capitalFirstLetter(workOrder.area)}
        />
        <Field
          label='Installation'
          value={
            workOrder.installation_type &&
            capitalFirstLetter(workOrder.installation_type)
          }
        />
        <Field
          label='Land owner'
          value={
            workOrder.land_owner_name &&
            capitalFirstLetter(workOrder.land_owner_name)
          }
        />
      </div>

      {hasNotes && (
        <div className='flex items-start gap-2 border-t border-gray-100 px-6 py-2.5 text-xs'>
          <div
            className={cn(
              "min-w-0 flex-1 space-y-1 text-gray-600",
              !isNotesExpanded && "line-clamp-1",
            )}>
            {workOrder.description && (
              <p className='leading-relaxed'>
                <span className='font-medium text-gray-500'>Description </span>
                {capitalFirstLetter(workOrder.description)}
              </p>
            )}
            {workOrder.remarks && (
              <p className='leading-relaxed'>
                <span className='font-medium text-gray-500'>Remarks </span>
                {capitalFirstLetter(workOrder.remarks)}
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={() => setIsNotesExpanded((prev) => !prev)}
            aria-expanded={isNotesExpanded}
            className='shrink-0 font-medium text-emerald-600 hover:text-emerald-700'>
            {isNotesExpanded ? "less" : "more"}
          </button>
        </div>
      )}

      {workOrder.cancellation_reason && (
        <div className='flex items-start gap-2 border-t border-rose-100 bg-rose-50/70 px-6 py-2.5 text-xs'>
          <Ban className='mt-0.5 size-3.5 shrink-0 text-rose-500' />
          <p className='min-w-0 leading-relaxed text-rose-700'>
            <span className='font-medium text-rose-600'>Cancelled </span>
            {workOrder.cancellation_reason}
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkOrderDetailsCard;
