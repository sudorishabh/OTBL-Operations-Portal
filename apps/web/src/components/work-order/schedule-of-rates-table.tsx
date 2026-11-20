import React, { useState } from "react";
import { MapPin, ReceiptIndianRupee, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DialogWindow from "@/components/shared/dialog-window";
import {
  LIST_CELL,
  LIST_FRAME,
  LIST_HEAD,
  LIST_HEAD_ROW,
  LIST_ROW,
  LIST_SUBTEXT,
  ListPill,
  type PillTone,
} from "@/components/shared/list-table";
import useHandleParams from "@/hooks/useHandleParams";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { workOrderTypes } from "@pkg/schema";
import { useIsAdmin } from "@/contexts/AuthContext";
import { constants, toNumberSafe } from "@pkg/utils";
import EditScheduleOfRatesDialog from "./edit-schedule-of-rates-dialog";
import {
  isBioremediationActivity,
  isBioremediationSite,
  restorationSiteOf,
  siteUsedQuantity,
  sorUsage,
  type SorUsageSite,
} from "./sor-usage";

const { TRANSPORT_SLABS, WO_UNITS, allActivityOptions } = constants;

interface ScheduleOfRate {
  id: number;
  work_order_id: number;
  activity: string;
  unit: string;
  estimated_quantity: string;
  rc_unit_rate: string;
  gst_percentage: string;
  unit_rate_inc_gst: string;
  total_cost: string;
  transportation_km?: string | null;
  transportation_slabs?: workOrderTypes.TransportationSlabs | null;
}

interface Site extends SorUsageSite {
  site: { id?: number | null; name: string };
  status?: string | null;
  total_expenses?: string;
  expense_entry_count?: number;
}

interface WorkOrderExpenseSummary {
  total_expenses: number;
  exceeded_total?: number;
  expense_entry_count: number;
}

interface Props {
  scheduleOfRates: ScheduleOfRate[];
  sites: Site[];
  expenseSummary?: WorkOrderExpenseSummary | null;
}

// Within this of nothing, a quantity counts as used up.
const QTY_EPSILON = 0.001;

// How many more sites the Sites table lists at a time.
const SITES_STEP = 20;

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(toNumberSafe(amount));

const formatQuantity = (value: unknown) =>
  toNumberSafe(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const formatActivityName = (name: string) =>
  name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const activityLabel = (activity: string) =>
  allActivityOptions.find((option) => option.value === activity)?.label ??
  formatActivityName(activity);

// Rows follow the same activity order as the create work order form.
const activityOrder = (activity: string) => {
  const index = allActivityOptions.findIndex(
    (option) => option.value === activity,
  );
  return index === -1 ? allActivityOptions.length : index;
};

const percentOf = (part: number, whole: number) =>
  whole > 0 ? (part / whole) * 100 : 0;

const SITE_STATUSES: Record<string, { label: string; tone: PillTone }> = {
  pending: { label: "Pending", tone: "yellow" },
  completed: { label: "Complete", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};

const siteStatus = (site: Site) =>
  site.is_completed
    ? SITE_STATUSES.completed!
    : (SITE_STATUSES[site.status ?? ""] ?? SITE_STATUSES.pending!);

// The table primitives add `sm:` padding and height, so these pin both sizes.
const NUMBER_CELL = cn(LIST_CELL, "text-right tabular-nums");
const SLAB_NUMBER = "px-4 py-1.5 text-right text-xs tabular-nums text-gray-600";

const SectionTitle = ({
  Icon,
  iconClass,
  title,
  description,
  action,
}: {
  Icon: React.ElementType;
  iconClass: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className='mb-3 flex items-center gap-3 px-1'>
    <div className={cn("rounded-lg p-2", iconClass)}>
      <Icon className='size-4' />
    </div>
    <div className='min-w-0'>
      <h3 className='text-sm font-semibold text-gray-900'>{title}</h3>
      <p className='text-xs text-gray-500'>{description}</p>
    </div>
    {action && <div className='ml-auto shrink-0'>{action}</div>}
  </div>
);

const Stat = ({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  valueClass?: string;
}) => (
  <div className='min-w-0 px-4 py-3'>
    <p className='text-xs font-medium text-gray-500'>{label}</p>
    <p
      className={cn(
        "mt-0.5 truncate text-base font-semibold tabular-nums text-gray-900",
        valueClass,
      )}>
      {value}
    </p>
    {hint && <p className='mt-0.5 text-xs text-gray-400'>{hint}</p>}
  </div>
);

const Pending = () => (
  <span
    aria-label='Loading'
    className='ml-auto block h-3 w-10 animate-pulse rounded bg-gray-100'
  />
);

// What is left of a quantity: green once used up, red past it.
const LeftValue = ({ left, total }: { left: number; total: number }) => {
  if (left < -QTY_EPSILON) {
    return (
      <span
        className='font-medium text-rose-600'
        title='Used more than the schedule of rates allows'>
        {formatQuantity(left)}
      </span>
    );
  }
  if (total > 0 && left <= QTY_EPSILON) {
    return <span className='font-medium text-emerald-700'>0</span>;
  }
  return <>{formatQuantity(left)}</>;
};

// The work order's schedule of rates: each activity's rates and quantity,
// what the work has used of it, what that is worth, and how its sites and
// expenses stand against it.
const ScheduleOfRatesTable = ({
  scheduleOfRates,
  sites,
  expenseSummary,
}: Props) => {
  const { getParam, deleteParam } = useHandleParams();
  const isAdmin = useIsAdmin();
  const isDialogOpen = getParam("dialog") === "schedule-of-rates";
  // The sites listed so far; the totals are always of every site.
  const [visibleSites, setVisibleSites] = useState(SITES_STEP);

  const allSites = sites ?? [];
  const restoration = restorationSiteOf(allSites);
  const hasRestorationRates = (scheduleOfRates ?? []).some(
    (rate) => !isBioremediationActivity(rate.activity),
  );
  // Restoration's usage is what its job orders' certificates certify.
  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery(
    { work_order_site_id: restoration?.wo_site_id ?? 0 },
    { enabled: isDialogOpen && !!restoration && hasRestorationRates },
  );
  const certificatesLoading = jobOrdersQuery.isLoading;

  if (!scheduleOfRates || scheduleOfRates.length === 0) {
    return null;
  }

  const usage = sorUsage(allSites, jobOrdersQuery.data ?? []);

  const rows = [...scheduleOfRates]
    .sort((a, b) => activityOrder(a.activity) - activityOrder(b.activity))
    .map((item) => {
      const quantity = toNumberSafe(item.estimated_quantity);
      const used = usage.used(item.activity);
      return {
        item,
        quantity,
        used,
        usedValue: used * toNumberSafe(item.unit_rate_inc_gst),
        isBioremediation: isBioremediationActivity(item.activity),
      };
    });

  const grandTotal = rows.reduce(
    (sum, row) => sum + toNumberSafe(row.item.total_cost),
    0,
  );
  const usedTotal = rows.reduce((sum, row) => sum + row.usedValue, 0);
  const usedPct = percentOf(usedTotal, grandTotal);

  const gstRates = new Set(
    scheduleOfRates.map((item) => Number(item.gst_percentage)),
  );
  const gstLabel = gstRates.size === 1 ? ` (${[...gstRates][0]}%)` : "";

  // Bioremediation sites draw on the one bioremediation rate.
  const bioremediationRate = toNumberSafe(
    rows.find((row) => row.isBioremediation)?.item.unit_rate_inc_gst,
  );
  const restorationRows = rows.filter((row) => !row.isBioremediation);
  const restorationUsedValue = restorationRows.reduce(
    (sum, row) => sum + row.usedValue,
    0,
  );

  // The restoration first, then the sites as listed on the work order.
  const siteRows = [...allSites].sort(
    (a, b) =>
      Number(b.wo_site_id === restoration?.wo_site_id) -
      Number(a.wo_site_id === restoration?.wo_site_id),
  );
  const siteUsedValue = (site: Site) =>
    site.wo_site_id === restoration?.wo_site_id
      ? restorationUsedValue
      : siteUsedQuantity(site) * bioremediationRate;
  const expensesOf = (site: Site) => toNumberSafe(site.total_expenses);
  const sitesUsedTotal = siteRows.reduce(
    (sum, site) => sum + siteUsedValue(site),
    0,
  );
  const sitesExpenseTotal = siteRows.reduce(
    (sum, site) => sum + expensesOf(site),
    0,
  );

  const expenses = toNumberSafe(expenseSummary?.total_expenses);
  const exceeded = toNumberSafe(expenseSummary?.exceeded_total);
  const profit = grandTotal - expenses;
  const isProfit = profit >= 0;

  return (
    <DialogWindow
      size='2xl'
      heightMode='fixed'
      title='Schedule of Rates'
      description="The work order's rates and quantities, what the work has used of them, and how its sites and expenses stand"
      open={isDialogOpen}
      setOpen={() => deleteParam("dialog")}>
      <div className='space-y-8 pb-8'>
        <section>
          <SectionTitle
            Icon={ReceiptIndianRupee}
            iconClass='bg-blue-50 text-blue-600'
            title='Schedule of Rates (SOR)'
            description='Approved rates and quantities, and what the work has used of each'
            action={
              isAdmin && (
                <EditScheduleOfRatesDialog
                  scheduleOfRates={scheduleOfRates}
                  usedQuantity={certificatesLoading ? undefined : usage.used}
                />
              )
            }
          />

          <div className={cn(LIST_FRAME, "mb-3")}>
            <div className='grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
              <Stat
                label='SOR total (incl. GST)'
                value={formatCurrency(grandTotal)}
              />
              <Stat
                label='Used so far'
                value={
                  certificatesLoading ? <Pending /> : formatCurrency(usedTotal)
                }
                valueClass='text-emerald-700'
                hint={`${usedPct.toFixed(1)}% of the SOR total`}
              />
              <Stat
                label='Left'
                value={
                  certificatesLoading ? (
                    <Pending />
                  ) : (
                    formatCurrency(grandTotal - usedTotal)
                  )
                }
                valueClass={
                  grandTotal - usedTotal < 0 ? "text-rose-600" : undefined
                }
              />
            </div>
            <div className='border-t border-gray-100 px-4 py-2.5'>
              <div className='h-1.5 overflow-hidden rounded-full bg-gray-100'>
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usedPct > 100 ? "bg-rose-500" : "bg-emerald-500",
                  )}
                  style={{ width: `${Math.min(100, usedPct)}%` }}
                />
              </div>
              <p className='mt-1.5 text-xs text-gray-400'>
                Bioremediation uses a site&apos;s estimate once the site is
                complete; restoration uses what its completion certificates
                certify.
              </p>
            </div>
          </div>

          <div className={LIST_FRAME}>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className={LIST_HEAD_ROW}>
                    <TableHead className={LIST_HEAD}>Activity</TableHead>
                    <TableHead className={LIST_HEAD}>Unit</TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      SOR qty
                    </TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      Used
                    </TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      Left
                    </TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      RC rate
                    </TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      Rate + GST{gstLabel}
                    </TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ item, quantity, used, isBioremediation }) => {
                    const slabs = item.transportation_slabs;
                    const waiting = !isBioremediation && certificatesLoading;
                    const unallotted =
                      isBioremediation &&
                      usage.bioremediationAllotted - used > QTY_EPSILON;

                    return (
                      <React.Fragment key={item.id}>
                        <TableRow
                          className={cn(
                            LIST_ROW,
                            "hover:bg-transparent",
                            slabs && "border-b-0",
                          )}>
                          <TableCell className={LIST_CELL}>
                            <p className='font-medium text-gray-900'>
                              {activityLabel(item.activity)}
                            </p>
                            {slabs && (
                              <p className={cn(LIST_SUBTEXT, "mt-0.5")}>
                                Quantity and RC rate are the totals of the
                                distance slabs.
                              </p>
                            )}
                          </TableCell>
                          <TableCell className={LIST_CELL}>
                            <span className='rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700'>
                              {item.unit}
                            </span>
                          </TableCell>
                          <TableCell className={NUMBER_CELL}>
                            {formatQuantity(quantity)}
                          </TableCell>
                          <TableCell
                            className={NUMBER_CELL}
                            title={
                              isBioremediation
                                ? "The estimates of the complete bioremediation sites"
                                : "Certified by the job orders' completion certificates"
                            }>
                            {waiting ? (
                              <Pending />
                            ) : (
                              <>
                                <span
                                  className={cn(
                                    used > 0
                                      ? "text-gray-900"
                                      : "text-gray-300",
                                  )}>
                                  {formatQuantity(used)}
                                </span>
                                {unallotted && (
                                  <p className={LIST_SUBTEXT}>
                                    of{" "}
                                    {formatQuantity(
                                      usage.bioremediationAllotted,
                                    )}{" "}
                                    estimated
                                  </p>
                                )}
                              </>
                            )}
                          </TableCell>
                          <TableCell className={NUMBER_CELL}>
                            {waiting ? (
                              <Pending />
                            ) : (
                              <LeftValue
                                left={quantity - used}
                                total={quantity}
                              />
                            )}
                          </TableCell>
                          <TableCell className={NUMBER_CELL}>
                            {formatCurrency(item.rc_unit_rate)}
                          </TableCell>
                          <TableCell className={NUMBER_CELL}>
                            {formatCurrency(item.unit_rate_inc_gst)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              NUMBER_CELL,
                              "font-semibold text-gray-900",
                            )}>
                            {formatCurrency(item.total_cost)}
                          </TableCell>
                        </TableRow>

                        {slabs &&
                          TRANSPORT_SLABS.map((slab, slabIndex) => {
                            const slabValue = slabs[slab.key];
                            const slabQuantity = toNumberSafe(
                              slabValue?.quantity,
                            );
                            const slabUsed = usage.usedOfSlab(slab.key);
                            const isLast =
                              slabIndex === TRANSPORT_SLABS.length - 1;
                            // Margins, not padding, so the guide line stops
                            // at the first and last slab.
                            const edgeClass = cn(
                              slabIndex === 0 && "mt-1",
                              isLast && "mb-2",
                            );
                            return (
                              <TableRow
                                key={slab.key}
                                className={cn(
                                  "hover:bg-transparent",
                                  isLast ? LIST_ROW : "border-b-0",
                                )}>
                                <TableCell className='p-0 sm:p-0'>
                                  <div
                                    className={cn(
                                      "ml-6 border-l border-gray-200 py-1.5 pl-4 text-xs text-gray-600",
                                      edgeClass,
                                    )}>
                                    {slab.label}
                                  </div>
                                </TableCell>
                                <TableCell className='p-0 sm:p-0' />
                                <TableCell className='p-0 sm:p-0'>
                                  <div className={cn(SLAB_NUMBER, edgeClass)}>
                                    {formatQuantity(slabQuantity)}
                                  </div>
                                </TableCell>
                                <TableCell className='p-0 sm:p-0'>
                                  <div className={cn(SLAB_NUMBER, edgeClass)}>
                                    {waiting ? (
                                      <Pending />
                                    ) : (
                                      formatQuantity(slabUsed)
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className='p-0 sm:p-0'>
                                  <div className={cn(SLAB_NUMBER, edgeClass)}>
                                    {waiting ? (
                                      <Pending />
                                    ) : (
                                      <LeftValue
                                        left={slabQuantity - slabUsed}
                                        total={slabQuantity}
                                      />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className='p-0 sm:p-0'>
                                  <div className={cn(SLAB_NUMBER, edgeClass)}>
                                    {formatCurrency(slabValue?.rate ?? 0)}
                                  </div>
                                </TableCell>
                                <TableCell
                                  colSpan={2}
                                  className='p-0 sm:p-0'
                                />
                              </TableRow>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
                <TableFooter className='border-gray-200 bg-gray-50'>
                  <TableRow className='hover:bg-gray-50'>
                    <TableCell
                      colSpan={7}
                      className={cn(LIST_CELL, "text-right font-medium")}>
                      SOR total (incl. GST)
                    </TableCell>
                    <TableCell
                      className={cn(
                        NUMBER_CELL,
                        "font-semibold text-emerald-700",
                      )}>
                      {formatCurrency(grandTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </section>

        {expenseSummary && (
          <section>
            <SectionTitle
              Icon={Wallet}
              iconClass='bg-rose-50 text-rose-600'
              title='Expenses & profitability'
              description='Recorded costs across all sites against the SOR total'
            />
            <div
              className={cn(
                LIST_FRAME,
                "grid grid-cols-2 divide-gray-100 sm:grid-cols-4 sm:divide-x",
              )}>
              <Stat
                label='Income (SOR total)'
                value={formatCurrency(grandTotal)}
                valueClass='text-emerald-700'
              />
              <Stat
                label='Total expenses'
                value={formatCurrency(expenses)}
                valueClass='text-rose-700'
                hint={
                  exceeded > 0
                    ? `${formatCurrency(exceeded)} exceeded`
                    : undefined
                }
              />
              <Stat
                label={isProfit ? "Profit" : "Loss"}
                value={formatCurrency(Math.abs(profit))}
                valueClass={isProfit ? "text-blue-700" : "text-orange-700"}
                hint={`${percentOf(profit, grandTotal).toFixed(1)}% margin`}
              />
              <Stat
                label='Expense records'
                value={toNumberSafe(
                  expenseSummary.expense_entry_count,
                ).toLocaleString("en-IN")}
              />
            </div>
          </section>
        )}

        <section>
          <SectionTitle
            Icon={MapPin}
            iconClass='bg-emerald-50 text-emerald-600'
            title='Sites'
            description="Each site's share of the SOR, what it has used and what it has cost"
          />
          <div className={LIST_FRAME}>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className={LIST_HEAD_ROW}>
                    <TableHead className={LIST_HEAD}>Site</TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      SOR share
                    </TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      Used
                    </TableHead>
                    <TableHead className={cn(LIST_HEAD, "text-right")}>
                      Expenses
                    </TableHead>
                    <TableHead className={LIST_HEAD}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteRows.length === 0 ? (
                    <TableRow className={cn(LIST_ROW, "hover:bg-transparent")}>
                      <TableCell
                        colSpan={5}
                        className={cn(
                          LIST_CELL,
                          "py-8 text-center text-gray-500",
                        )}>
                        No sites found for this work order.
                      </TableCell>
                    </TableRow>
                  ) : (
                    siteRows.slice(0, visibleSites).map((site) => {
                      const isRestoration =
                        site.wo_site_id === restoration?.wo_site_id;
                      const estimate = isBioremediationSite(site)
                        ? site.estimate
                        : null;
                      const usedValue = siteUsedValue(site);
                      const siteExpenses = expensesOf(site);
                      const records = site.expense_entry_count ?? 0;
                      const status = siteStatus(site);

                      return (
                        <TableRow
                          key={site.wo_site_id}
                          className={cn(LIST_ROW, "hover:bg-gray-50/60")}>
                          <TableCell className={LIST_CELL}>
                            <p className='font-medium text-gray-900'>
                              {site.site.name}
                            </p>
                          </TableCell>
                          <TableCell className={NUMBER_CELL}>
                            {isRestoration ? (
                              <span
                                className='text-gray-400'
                                title='Restoration draws on its SOR activities directly'>
                                —
                              </span>
                            ) : estimate ? (
                              <>
                                {formatQuantity(estimate.quantity)}{" "}
                                {WO_UNITS.MT}
                                <p className={LIST_SUBTEXT}>
                                  {formatCurrency(
                                    toNumberSafe(estimate.quantity) *
                                      bioremediationRate,
                                  )}
                                </p>
                              </>
                            ) : (
                              <span className='text-gray-400'>No estimate</span>
                            )}
                          </TableCell>
                          <TableCell className={NUMBER_CELL}>
                            {isRestoration && certificatesLoading ? (
                              <Pending />
                            ) : usedValue > 0 ? (
                              <span className='font-medium text-emerald-700'>
                                {formatCurrency(usedValue)}
                              </span>
                            ) : (
                              <span className='text-gray-300'>—</span>
                            )}
                          </TableCell>
                          <TableCell className={NUMBER_CELL}>
                            {records > 0 || siteExpenses > 0 ? (
                              <>
                                <span className='font-medium text-rose-700'>
                                  {formatCurrency(siteExpenses)}
                                </span>
                                <p className={LIST_SUBTEXT}>
                                  {records}{" "}
                                  {records === 1 ? "record" : "records"}
                                </p>
                              </>
                            ) : (
                              <span className='text-gray-300'>—</span>
                            )}
                          </TableCell>
                          <TableCell className={LIST_CELL}>
                            <ListPill tone={status.tone}>
                              {status.label}
                            </ListPill>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {siteRows.length > 0 && (
                  <TableFooter className='border-gray-200 bg-gray-50'>
                    <TableRow className='hover:bg-gray-50'>
                      <TableCell className={cn(LIST_CELL, "font-medium")}>
                        {siteRows.length}{" "}
                        {siteRows.length === 1 ? "site" : "sites"}
                      </TableCell>
                      <TableCell className={cn(NUMBER_CELL, "font-medium")}>
                        {formatQuantity(usage.bioremediationAllotted)}{" "}
                        {WO_UNITS.MT}
                      </TableCell>
                      <TableCell
                        className={cn(
                          NUMBER_CELL,
                          "font-semibold text-emerald-700",
                        )}>
                        {certificatesLoading ? (
                          <Pending />
                        ) : (
                          formatCurrency(sitesUsedTotal)
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          NUMBER_CELL,
                          "font-semibold text-rose-700",
                        )}>
                        {formatCurrency(sitesExpenseTotal)}
                      </TableCell>
                      <TableCell className={LIST_CELL} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
            {siteRows.length > visibleSites && (
              <div className='border-t border-gray-100 py-2.5 text-center'>
                <button
                  type='button'
                  onClick={() => setVisibleSites((count) => count + SITES_STEP)}
                  className='cursor-pointer text-xs font-medium text-emerald-700 hover:underline'>
                  Show {Math.min(SITES_STEP, siteRows.length - visibleSites)}{" "}
                  more of {siteRows.length} sites
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </DialogWindow>
  );
};

export default ScheduleOfRatesTable;
