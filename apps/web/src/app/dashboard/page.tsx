"use client";
import { useAuthContext, useIsAdmin } from "@/contexts/AuthContext";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import DashboardPageSkeleton from "@/components/skeleton/dashboard/dashboard-page-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  LogOut,
  MapPin,
  ReceiptIndianRupee,
  Shield,
  Tent,
  UserCheck,
  Users,
  Users2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { capitalFirstLetter } from "@pkg/utils";

type DashboardWorkOrderRow =
  RouterOutputs["workOrderQuery"]["getAll"]["workOrders"][number];
type DashboardOfficeRow =
  RouterOutputs["officeQuery"]["getOffices"]["offices"][number];

type StatTone = "default" | "yellow" | "green" | "red";

const STAT_TONES: Record<StatTone, { icon: string; value: string }> = {
  default: { icon: "text-cyan-700", value: "text-gray-900" },
  yellow: { icon: "text-yellow-600", value: "text-yellow-700" },
  green: { icon: "text-emerald-600", value: "text-emerald-700" },
  red: { icon: "text-rose-500", value: "text-rose-600" },
};

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const Empty = () => <span className='text-gray-300'>&mdash;</span>;

function formatShortDate(value: Date | string | null | undefined) {
  if (value == null) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { user, logout, isUserLoading } = useAuthContext();
  const isAdmin = useIsAdmin();

  const layoutQuery = trpc.authQuery.dashboardLayout.useQuery(undefined, {
    retry: false,
  });

  const clientsQuery = trpc.clientQuery.totalClientAndContact.useQuery(
    undefined,
    { enabled: !isUserLoading },
  );

  const officesQuery = trpc.officeQuery.getOffices.useQuery(
    {},
    { enabled: !isUserLoading },
  );

  const woTotalQuery = trpc.workOrderQuery.getAll.useQuery(
    { page: 1, limit: 1, workOrderOrder: "latest" },
    { enabled: !isUserLoading },
  );

  const woPendingQuery = trpc.workOrderQuery.getAll.useQuery(
    { page: 1, limit: 1, status: "pending", workOrderOrder: "latest" },
    { enabled: !isUserLoading },
  );

  const woCompletedQuery = trpc.workOrderQuery.getAll.useQuery(
    { page: 1, limit: 1, status: "completed", workOrderOrder: "latest" },
    { enabled: !isUserLoading },
  );

  const woCancelledQuery = trpc.workOrderQuery.getAll.useQuery(
    { page: 1, limit: 1, status: "cancelled", workOrderOrder: "latest" },
    { enabled: !isUserLoading },
  );

  const woRecentQuery = trpc.workOrderQuery.getAll.useQuery(
    { page: 1, limit: 8, workOrderOrder: "latest" },
    { enabled: !isUserLoading },
  );

  const officeStats = useMemo(() => {
    const offices: DashboardOfficeRow[] = officesQuery.data?.offices ?? [];
    const siteTotal = offices.reduce(
      (sum: number, o: DashboardOfficeRow) => sum + (Number(o.siteCount) || 0),
      0,
    );
    return { officeCount: offices.length, siteTotal };
  }, [officesQuery.data]);

  const scopeCopy = useMemo(() => {
    const mode = layoutQuery.data?.mode;
    switch (mode) {
      case "full":
        return {
          title: "Full access",
          description:
            "View and manage all offices, clients, and work orders across the organization.",
        };
      case "office":
        return {
          title: "Office-scoped",
          description:
            "Figures are limited to offices and work you are assigned to.",
        };
      case "site_only":
        return {
          title: "Site assignment",
          description: "You are routed to your assigned sites.",
        };
      case "wo_site_upload":
        return {
          title: "Field upload",
          description:
            "You are routed to your work order site upload workspace.",
        };
      default:
        return {
          title: "Access",
          description: "Loading your access scope…",
        };
    }
  }, [layoutQuery.data?.mode]);

  const statsLoading =
    clientsQuery.isLoading ||
    officesQuery.isLoading ||
    woTotalQuery.isLoading ||
    woPendingQuery.isLoading ||
    woCompletedQuery.isLoading ||
    woCancelledQuery.isLoading;

  const recentWorkOrders: DashboardWorkOrderRow[] =
    woRecentQuery.data?.workOrders ?? [];

  if (isUserLoading) {
    return (
      <PageWrapper
        title='Overview'
        description='OTBL Operations Portal'>
        <DashboardPageSkeleton />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title='Overview'
      description={
        user?.name
          ? `Signed in as ${user.name} · ${user.role}`
          : "OTBL Operations Portal"
      }
      button={
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-1.5 bg-white shadow-sm'
          onClick={() => logout()}>
          <LogOut className='size-3.5' />
          Log out
        </Button>
      }>
      <div className='mt-3 space-y-3'>
        {/* Scope, figures and shortcuts collapsed into one dense card. */}
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5'>
            <div className='flex min-w-0 items-center gap-2.5'>
              <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 ring-1 ring-inset ring-cyan-100'>
                <Shield className='size-4 text-cyan-700' />
              </div>
              <div className='min-w-0'>
                <p className='truncate text-[14px] font-semibold leading-tight text-gray-900'>
                  {scopeCopy.title}
                </p>
                <p className='truncate text-[12px] leading-tight text-gray-500'>
                  {scopeCopy.description}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {user?.email && (
                <span className='hidden truncate text-[12px] text-gray-500 sm:inline'>
                  {user.email}
                </span>
              )}
              {user?.status && (
                <Badge
                  variant='outline'
                  className='h-5 px-1.5 text-[11px] font-normal capitalize'>
                  {user.status}
                </Badge>
              )}
            </div>
          </div>

          <div className='grid grid-cols-2 divide-x divide-y divide-gray-200 border-y border-gray-200 bg-gray-50/60 sm:grid-cols-4 lg:grid-cols-8 lg:divide-y-0'>
            <Stat
              icon={Users2}
              label='Clients'
              value={clientsQuery.data?.totalClients}
              loading={statsLoading}
            />
            <Stat
              icon={UserCheck}
              label='Contacts'
              value={clientsQuery.data?.totalContacts}
              loading={statsLoading}
            />
            <Stat
              icon={Building2}
              label='Offices'
              value={officeStats.officeCount}
              loading={statsLoading}
            />
            <Stat
              icon={MapPin}
              label='Sites'
              value={officeStats.siteTotal}
              loading={statsLoading}
            />
            <Stat
              icon={ReceiptIndianRupee}
              label='Work orders'
              value={woTotalQuery.data?.pagination.total}
              loading={statsLoading}
            />
            <Stat
              icon={Clock3}
              label='Pending'
              value={woPendingQuery.data?.pagination.total}
              loading={statsLoading}
              tone='yellow'
            />
            <Stat
              icon={CheckCircle2}
              label='Completed'
              value={woCompletedQuery.data?.pagination.total}
              loading={statsLoading}
              tone='green'
            />
            <Stat
              icon={XCircle}
              label='Cancelled'
              value={woCancelledQuery.data?.pagination.total}
              loading={statsLoading}
              tone='red'
            />
          </div>

          <div className='flex flex-wrap items-center gap-1.5 px-4 py-2'>
            <span className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
              Go to
            </span>
            <QuickLink
              href='/dashboard/client'
              icon={Users2}
              label='Clients'
            />
            <QuickLink
              href='/dashboard/work-order'
              icon={ReceiptIndianRupee}
              label='Work orders'
            />
            <QuickLink
              href='/dashboard/office-site'
              icon={Tent}
              label='Offices & sites'
            />
            {isAdmin && (
              <QuickLink
                href='/dashboard/user'
                icon={Users}
                label='User management'
              />
            )}
          </div>
        </div>

        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-2'>
            <h2 className='text-[14px] font-semibold tracking-tight text-gray-900'>
              Recent work orders
            </h2>
            <Link
              href='/dashboard/work-order'
              className='inline-flex items-center gap-1 text-[12px] font-medium text-cyan-700 transition-colors hover:text-cyan-800'>
              View all
              <ArrowRight className='size-3' />
            </Link>
          </div>

          {woRecentQuery.isLoading ? (
            <div className='space-y-1.5 p-3'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className='h-7 w-full'
                />
              ))}
            </div>
          ) : woRecentQuery.isError ? (
            <p className='px-4 py-6 text-center text-[13px] text-rose-600'>
              Could not load work orders. Refresh and try again.
            </p>
          ) : recentWorkOrders.length === 0 ? (
            <p className='px-4 py-6 text-center text-[13px] text-gray-500'>
              No work orders yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className='border-gray-200 bg-gray-50/60 hover:bg-gray-50/60'>
                  <TableHead className='h-8 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
                    Code
                  </TableHead>
                  <TableHead className='h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
                    Title
                  </TableHead>
                  <TableHead className='h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
                    Client
                  </TableHead>
                  <TableHead className='hidden h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 lg:table-cell'>
                    Office
                  </TableHead>
                  <TableHead className='hidden h-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 md:table-cell'>
                    Updated
                  </TableHead>
                  <TableHead className='h-8 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWorkOrders.map((wo) => (
                  <TableRow
                    key={wo.id}
                    className='border-gray-100 text-[13px]'>
                    <TableCell className='px-4 py-1.5 font-mono font-medium'>
                      <Link
                        href={`/dashboard/work-order/${wo.id}`}
                        className='text-cyan-700 underline-offset-2 hover:underline'>
                        {wo.code.toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell
                      className='max-w-[220px] truncate px-3 py-1.5 font-medium text-gray-700'
                      title={wo.title}>
                      {capitalFirstLetter(wo.title)}
                    </TableCell>
                    <TableCell className='max-w-[140px] truncate px-3 py-1.5 text-gray-600'>
                      {wo.client_name ?? <Empty />}
                    </TableCell>
                    <TableCell className='hidden max-w-[140px] truncate px-3 py-1.5 text-gray-600 lg:table-cell'>
                      {wo.office_name ?? <Empty />}
                    </TableCell>
                    <TableCell className='hidden whitespace-nowrap px-3 py-1.5 text-gray-500 md:table-cell'>
                      {formatShortDate(wo.updated_at ?? wo.created_at)}
                    </TableCell>
                    <TableCell className='px-4 py-1.5 text-right'>
                      <Badge
                        className={cn(
                          "h-5 border px-1.5 text-[11px] font-medium",
                          STATUS_STYLES[wo.status],
                        )}>
                        {capitalFirstLetter(wo.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

// Divided metric tile: micro label with icon, headline figure underneath.
function Stat({
  icon: Icon,
  label,
  value,
  loading,
  tone = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  loading: boolean;
  tone?: StatTone;
}) {
  const styles = STAT_TONES[tone];

  return (
    <div className='min-w-0 px-3 py-2'>
      <div className='flex items-center gap-1.5'>
        <Icon className={cn("size-3 shrink-0", styles.icon)} />
        <span className='truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton className='mt-1 h-5 w-10' />
      ) : (
        <p
          className={cn(
            "mt-0.5 truncate text-[18px] font-semibold leading-tight tabular-nums",
            styles.value,
          )}>
          {Number(value ?? 0).toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className='inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-medium text-cyan-900 transition-colors hover:border-cyan-900/20 hover:bg-cyan-50'>
      <Icon className='size-3.5 text-cyan-700' />
      {label}
    </Link>
  );
}
