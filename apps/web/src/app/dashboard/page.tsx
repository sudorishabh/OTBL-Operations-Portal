"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import DashboardPageSkeleton, {
  RecentWorkOrdersSkeleton,
} from "@/components/skeleton/dashboard/dashboard-page-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { ModulesGrid } from "@/components/dashboard/modules-grid";
import { MonthlyExpensesCard } from "@/components/dashboard/monthly-expenses-card";
import { WorkOrderStatusCard } from "@/components/dashboard/work-order-status-card";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { ArrowRight, LogOut } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";

type DashboardWorkOrderRow =
  RouterOutputs["workOrderQuery"]["getAll"]["workOrders"][number];

// What the overview's figures cover, by how the user's access is scoped.
const SCOPE_COPY: Record<string, string> = {
  full: "All offices",
  office: "Your offices",
};

// "office_operator" reads "Office Operator".
const roleLabel = (role: string) => capitalizeEachWord(role.replace(/_/g, " "));

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

  const layoutQuery = trpc.authQuery.dashboardLayout.useQuery(undefined, {
    retry: false,
  });

  const woRecentQuery = trpc.workOrderQuery.getAll.useQuery(
    { page: 1, limit: 8, workOrderOrder: "latest" },
    { enabled: !isUserLoading },
  );

  // What the figures on the page cover.
  const scope = SCOPE_COPY[layoutQuery.data?.mode ?? ""] ?? "";

  const recentWorkOrders: DashboardWorkOrderRow[] =
    woRecentQuery.data?.workOrders ?? [];

  if (isUserLoading) {
    return (
      <PageWrapper
        breadcrumbs={[]}
        title='Overview'
        description='OTBL Operations Portal'>
        <DashboardPageSkeleton />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      breadcrumbs={[]}
      title='Overview'
      description={
        user?.name
          ? [user.name, roleLabel(user.role), scope].filter(Boolean).join(" · ")
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
        <KpiStrip />
        <ModulesGrid />

        <div className='grid gap-3 lg:grid-cols-3'>
          <MonthlyExpensesCard className='lg:col-span-2' />
          <WorkOrderStatusCard />
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
            <RecentWorkOrdersSkeleton />
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
                    Purchase order
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
                      className='max-w-[220px] truncate px-3 py-1.5 font-mono text-gray-700'
                      title={wo.purchase_order_code ?? undefined}>
                      {wo.purchase_order_code ?? <Empty />}
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
