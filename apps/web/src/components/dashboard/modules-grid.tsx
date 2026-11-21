"use client";
import React, { type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  HardHat,
  ReceiptIndianRupee,
  Tent,
  Users,
  Webhook,
} from "lucide-react";
import { constants } from "@pkg/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatCount } from "./format";
import {
  useAttention,
  useClientTotals,
  useFinanceSummary,
  useModuleCounts,
  useOfficeTotals,
  useWorkOrderSummary,
} from "./use-dashboard";

const { CONTRACT_ORDER_TYPE, ROLES } = constants;

type Figure = { label: string; value: number | undefined };

// Figures sit side by side, as many to a row as the module has.
const FIGURE_COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

// One section of the portal: its name, the records it holds, and a link to
// it.
const ModuleCard = ({
  href,
  icon: Icon,
  title,
  figures,
  loading,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  figures: Figure[];
  loading: boolean;
}) => (
  <Link
    href={href}
    className='group block min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-cyan-900/20 hover:bg-cyan-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40'>
    <div className='flex items-center justify-between gap-2'>
      <span className='flex min-w-0 items-center gap-2 text-[13px] font-semibold text-gray-900'>
        <Icon className='size-4 shrink-0 text-cyan-700' />
        <span className='truncate'>{title}</span>
      </span>
      <ArrowRight className='size-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-cyan-700' />
    </div>
    <dl
      className={cn(
        "mt-2.5 grid items-end gap-2",
        FIGURE_COLUMNS[figures.length],
      )}>
      {figures.map((figure) => (
        <div
          key={figure.label}
          className='min-w-0'>
          <dt className='text-[11px] leading-tight text-gray-500'>
            {figure.label}
          </dt>
          <dd className='text-[16px] font-semibold leading-tight tabular-nums text-gray-900'>
            {loading ? (
              <Skeleton className='mt-1 h-4 w-10' />
            ) : figure.value === undefined ? (
              <span className='text-gray-300'>&mdash;</span>
            ) : (
              formatCount(figure.value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  </Link>
);

// Every section of the portal the user can open, with what it holds. Vendors
// show for those who can see them, users for admins. Orders and job orders
// are those of work orders not cancelled.
export const ModulesGrid = () => {
  const summary = useWorkOrderSummary();
  const attention = useAttention();
  const counts = useModuleCounts();
  const finance = useFinanceSummary();
  const clients = useClientTotals();
  const offices = useOfficeTotals();

  const isAdmin = useIsAdmin();

  const orders = attention.data?.contractOrders;
  const users = counts.data?.users;
  const vendors = counts.data?.vendors;

  return (
    <div className='grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3'>
      <ModuleCard
        href='/dashboard/work-order'
        icon={ReceiptIndianRupee}
        title='Work orders'
        loading={summary.isPending || attention.isPending}
        figures={[
          { label: "Work orders", value: summary.data?.total },
          {
            label: "Purchase orders",
            value:
              orders &&
              (orders[CONTRACT_ORDER_TYPE.PURCHASE_ORDER]?.total ?? 0),
          },
          {
            label: "Sub-contracts",
            value:
              orders && (orders[CONTRACT_ORDER_TYPE.SUB_CONTRACT]?.total ?? 0),
          },
          { label: "Job orders", value: attention.data?.jobOrders.total },
        ]}
      />
      <ModuleCard
        href='/dashboard/client'
        icon={Webhook}
        title='Clients'
        loading={clients.isPending || counts.isPending}
        figures={[
          { label: "Main clients", value: counts.data?.mainClients },
          { label: "Branches", value: clients.data?.totalClients },
          { label: "Contacts", value: clients.data?.totalContacts },
          { label: "Proposals", value: counts.data?.proposals.total },
        ]}
      />
      <ModuleCard
        href='/dashboard/office-site'
        icon={Tent}
        title='Offices & sites'
        loading={offices.isPending}
        figures={[
          { label: "Offices", value: offices.data?.officeCount },
          { label: "Sites", value: offices.data?.siteTotal },
        ]}
      />
      {vendors !== null && (
        <ModuleCard
          href='/dashboard/vendor'
          icon={HardHat}
          title='Vendors'
          loading={counts.isPending || finance.isPending}
          figures={[
            { label: "Vendors", value: vendors },
            // Those anything has been spent with.
            { label: "Paid", value: finance.data?.vendorCount },
          ]}
        />
      )}
      {isAdmin && (
        <ModuleCard
          href='/dashboard/user'
          icon={Users}
          title='Users'
          loading={counts.isPending}
          figures={[
            { label: "Users", value: users?.total },
            {
              label: "Office operators",
              value: users
                ? (users.byRole[ROLES.OFFICE_OPERATOR] ?? 0)
                : undefined,
            },
            {
              label: "Site operators",
              value: users
                ? (users.byRole[ROLES.SITE_OPERATOR] ?? 0)
                : undefined,
            },
          ]}
        />
      )}
    </div>
  );
};
