"use client";
import { LogOut } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import DashboardPageSkeleton from "@/components/skeleton/dashboard/dashboard-page-skeleton";
import { Button } from "@/components/ui/button";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { ModulesGrid } from "@/components/dashboard/modules-grid";
import { MonthlyExpensesCard } from "@/components/dashboard/monthly-expenses-card";
import { WorkOrderStatusCard } from "@/components/dashboard/work-order-status-card";
import { AttentionCard } from "@/components/dashboard/attention-card";
import { SpendingCard } from "@/components/dashboard/spending-card";
import { OfficesCard } from "@/components/dashboard/offices-card";
import { TopVendorsCard } from "@/components/dashboard/top-vendors-card";
import { RecentWorkOrdersCard } from "@/components/dashboard/recent-work-orders-card";
import { trpc } from "@/lib/trpc";

// What the overview's figures cover, by how the user's access is scoped.
const SCOPE_COPY: Record<string, string> = {
  full: "All offices",
  office: "Your offices",
};

// "office_operator" reads "Office Operator".
const roleLabel = (role: string) => capitalizeEachWord(role.replace(/_/g, " "));

// The portal's home: headline figures, every module, then charts and lists
// of what needs doing, each limited to what the user can see.
export default function DashboardPage() {
  const { user, logout, isUserLoading } = useAuthContext();

  const layoutQuery = trpc.authQuery.dashboardLayout.useQuery(undefined, {
    retry: false,
  });

  // What the figures on the page cover.
  const scope = SCOPE_COPY[layoutQuery.data?.mode ?? ""] ?? "";

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

        <div className='grid gap-3 lg:grid-cols-3'>
          <AttentionCard className='lg:col-span-2' />
          <SpendingCard />
        </div>

        <div className='grid gap-3 lg:grid-cols-3'>
          <OfficesCard className='lg:col-span-2' />
          <TopVendorsCard />
        </div>

        <RecentWorkOrdersCard />
      </div>
    </PageWrapper>
  );
}
