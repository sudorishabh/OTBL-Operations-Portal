"use client";
import React from "react";
import { capitalFirstLetter } from "@pkg/utils";
import {
  CARD_ERROR,
  CardLink,
  CardMessage,
  CardSkeleton,
  DashboardCard,
} from "./dashboard-card";
import { RankedBars } from "./ranked-bars";
import { formatCompactRupees, formatCount, formatCountOf } from "./format";
import { useFinanceSummary } from "./use-dashboard";

// The vendors most has been spent with, each leading to its page. Shows
// nothing for users who can't see vendors.
export const TopVendorsCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useFinanceSummary();
  if (data && data.topVendors === null) return null;

  return (
    <DashboardCard
      className={className}
      title='Top vendors'
      description='By what has been spent with them'
      action={<CardLink href='/dashboard/vendor'>All vendors</CardLink>}>
      {isPending ? (
        <CardSkeleton
          rows={5}
          label='Loading top vendors'
        />
      ) : !data?.topVendors ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.topVendors.length === 0 ? (
        <CardMessage>Nothing has been spent with a vendor yet.</CardMessage>
      ) : (
        <div className='px-4 py-4'>
          <RankedBars
            title='Vendors most has been spent with'
            formatValue={formatCompactRupees}
            rows={data.topVendors.map((vendor) => ({
              key: String(vendor.id),
              label: capitalFirstLetter(vendor.name),
              note: `${vendor.code} · ${formatCountOf(vendor.count, "expense")}`,
              value: vendor.total,
              href: `/dashboard/vendor/${vendor.id}`,
            }))}
          />
          <p className='mt-3 text-[11px] text-gray-400'>
            {data.vendorCount === 1
              ? "1 vendor has been paid in all."
              : `${formatCount(data.vendorCount)} vendors have been paid in all.`}
          </p>
        </div>
      )}
    </DashboardCard>
  );
};
