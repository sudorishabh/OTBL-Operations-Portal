"use client";
import { useAuthContext, useIsAdmin } from "@/contexts/AuthContext";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import DashboardPageSkeleton from "@/components/skeleton/dashboard/dashboard-page-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

function formatShortDate(value: Date | string | null | undefined) {
  if (value == null) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function workOrderStatusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-600 hover:bg-green-700 text-white border-transparent";
    case "pending":
      return "bg-yellow-600 hover:bg-yellow-700 text-white border-transparent";
    case "cancelled":
      return "bg-red-600 hover:bg-red-700 text-white border-transparent";
    default:
      return "";
  }
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
          description: "You are routed to your work order site upload workspace.",
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
        description='OTBL management dashboard'>
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
          : "OTBL management dashboard"
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
      <div className='mt-4 space-y-4'>
        <Card className='shadow-sm border-cyan-900/10'>
          <CardContent className='px-4 py-2.5'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm'>
              <Shield className='size-3.5 shrink-0 text-cyan-800' />
              <span className='font-medium text-cyan-900'>{scopeCopy.title}</span>
              <Separator orientation='vertical' className='h-3.5 hidden sm:block' />
              <span className='text-muted-foreground text-xs'>{scopeCopy.description}</span>
              <div className='ml-auto flex items-center gap-2'>
                {user?.status && (
                  <Badge
                    variant='outline'
                    className='h-5 px-1.5 text-[10px] font-normal capitalize'>
                    {user.status}
                  </Badge>
                )}
                {user?.email && (
                  <span className='text-xs text-muted-foreground hidden sm:inline'>
                    {user.email}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>
            At a glance
          </p>
          <div className='grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4'>
            <StatTile
              icon={Users2}
              label='Clients'
              value={clientsQuery.data?.totalClients}
              loading={statsLoading}
            />
            <StatTile
              icon={UserCheck}
              label='Client contacts'
              value={clientsQuery.data?.totalContacts}
              loading={statsLoading}
            />
            <StatTile
              icon={Building2}
              label='Offices'
              value={officeStats.officeCount}
              loading={statsLoading}
            />
            <StatTile
              icon={MapPin}
              label='Sites'
              value={officeStats.siteTotal}
              loading={statsLoading}
            />
            <StatTile
              icon={ReceiptIndianRupee}
              label='Total work orders'
              value={woTotalQuery.data?.pagination.total}
              loading={statsLoading}
            />
            <StatTile
              icon={Clock3}
              label='Pending'
              value={woPendingQuery.data?.pagination.total}
              loading={statsLoading}
              accent='yellow'
            />
            <StatTile
              icon={CheckCircle2}
              label='Completed'
              value={woCompletedQuery.data?.pagination.total}
              loading={statsLoading}
              accent='green'
            />
            <StatTile
              icon={XCircle}
              label='Cancelled'
              value={woCancelledQuery.data?.pagination.total}
              loading={statsLoading}
              accent='red'
            />
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <Card className='lg:col-span-2 shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-2'>
              <CardTitle className='text-sm font-semibold text-cyan-900'>
                Recent work orders
              </CardTitle>
              <Button
                variant='ghost'
                size='sm'
                asChild
                className='h-7 gap-1 px-2 text-xs text-cyan-800'>
                <Link href='/dashboard/work-order'>
                  View all
                  <ArrowRight className='size-3' />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className='p-0'>
              {woRecentQuery.isLoading ? (
                <div className='space-y-1.5 px-4 pb-4'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className='h-8 w-full'
                    />
                  ))}
                </div>
              ) : woRecentQuery.isError ? (
                <p className='px-4 pb-4 text-xs text-destructive'>
                  Could not load work orders. Refresh and try again.
                </p>
              ) : recentWorkOrders.length === 0 ? (
                <p className='px-4 pb-4 text-xs text-muted-foreground'>
                  No work orders yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead className='px-4 text-[11px] font-semibold'>Code</TableHead>
                      <TableHead className='text-[11px] font-semibold'>Title</TableHead>
                      <TableHead className='text-[11px] font-semibold'>Client</TableHead>
                      <TableHead className='hidden lg:table-cell text-[11px] font-semibold'>Office</TableHead>
                      <TableHead className='hidden md:table-cell text-[11px] font-semibold'>Updated</TableHead>
                      <TableHead className='text-[11px] font-semibold'>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentWorkOrders.map((wo) => (
                      <TableRow
                        key={wo.id}
                        className='text-xs'>
                        <TableCell className='px-4 py-2 font-medium'>
                          <Link
                            href={`/dashboard/work-order/${wo.id}`}
                            className='text-cyan-800 underline-offset-2 hover:underline'>
                            {wo.code}
                          </Link>
                        </TableCell>
                        <TableCell className='max-w-[160px] truncate py-2'>
                          {wo.title}
                        </TableCell>
                        <TableCell className='py-2 max-w-[120px] truncate'>
                          {wo.client_name ?? "—"}
                        </TableCell>
                        <TableCell className='hidden lg:table-cell py-2 max-w-[120px] truncate'>
                          {wo.office_name ?? "—"}
                        </TableCell>
                        <TableCell className='hidden md:table-cell py-2 whitespace-nowrap text-muted-foreground'>
                          {formatShortDate(wo.updated_at ?? wo.created_at)}
                        </TableCell>
                        <TableCell className='py-2'>
                          <Badge
                            variant='secondary'
                            className={cn(
                              "h-5 px-1.5 text-[10px]",
                              workOrderStatusBadgeClass(wo.status),
                            )}>
                            {capitalFirstLetter(wo.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className='shadow-sm'>
            <CardHeader className='px-4 pt-3 pb-2'>
              <CardTitle className='text-sm font-semibold text-cyan-900'>
                Quick navigation
              </CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-1 px-3 pb-3 pt-0'>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  loading: boolean;
  accent?: "yellow" | "green" | "red";
}) {
  const iconBg = accent === "yellow"
    ? "bg-yellow-50 text-yellow-700"
    : accent === "green"
      ? "bg-green-50 text-green-700"
      : accent === "red"
        ? "bg-red-50 text-red-600"
        : "bg-cyan-900/10 text-cyan-900";

  const numColor = accent === "yellow"
    ? "text-yellow-700"
    : accent === "green"
      ? "text-green-700"
      : accent === "red"
        ? "text-red-600"
        : "text-cyan-900";

  return (
    <Card className='shadow-sm'>
      <CardContent className='p-1 sm:p-3'>
        <div className='flex items-center justify-between gap-1'>
          <div className='min-w-0'>
            <p className='truncate text-[9px] sm:text-[11px] font-medium text-muted-foreground leading-tight'>
              {label}
            </p>
            {loading ? (
              <Skeleton className='mt-0.5 h-4 w-8 sm:mt-1.5 sm:h-6 sm:w-12' />
            ) : (
              <p className={cn("text-base sm:text-xl font-semibold tabular-nums leading-tight", numColor)}>
                {value ?? 0}
              </p>
            )}
          </div>
          <div className={cn("shrink-0 rounded p-1 sm:p-1.5", iconBg)}>
            <Icon className='size-2.5 sm:size-3.5' />
          </div>
        </div>
      </CardContent>
    </Card>
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
      className='flex items-center justify-between rounded-md border border-transparent bg-gray-50 px-3 py-2 text-xs font-medium text-cyan-900 transition-colors hover:border-cyan-900/15 hover:bg-cyan-50'>
      <span className='flex items-center gap-2'>
        <Icon className='size-3.5 text-cyan-700' />
        {label}
      </span>
      <ArrowRight className='size-3 opacity-40' />
    </Link>
  );
}
