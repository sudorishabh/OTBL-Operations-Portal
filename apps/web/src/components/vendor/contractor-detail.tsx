"use client";
import React from "react";
import { HardHat } from "lucide-react";
import {
  capitalFirstLetter,
  capitalizeEachWord,
  formatCurrency,
} from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { VendorDetailSkeleton } from "@/components/skeleton/vendor/vendor-skeletons";
import RecordCode from "@/components/shared/record-code";
import VendorExpensesSection from "./expenses/vendor-expenses-section";
import { VendorJobOrdersTable, VendorOrdersTable } from "./vendor-work-tables";

interface Props {
  contractorId: number;
}

const Summary = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className='px-4 py-3'>
    <p className='text-xs text-gray-500'>{label}</p>
    <p className='mt-0.5 text-base font-semibold tabular-nums text-gray-900'>
      {value}
    </p>
  </div>
);

// A vendor's own page: who they are, everything spent with them, and every
// order and job order they are on with what has been spent under each.
const ContractorDetail = ({ contractorId }: Props) => {
  const contractorQuery = trpc.contractorQuery.getContractor.useQuery({
    id: contractorId,
  });
  // The totals; each table below loads its own pages.
  const workQuery = trpc.contractorQuery.getContractorWork.useQuery({
    id: contractorId,
  });
  const contractor = contractorQuery.data?.contractor;
  const orderCount = workQuery.data?.order_count ?? 0;
  const jobOrderCount = workQuery.data?.job_order_count ?? 0;
  const totalSpent = workQuery.data?.total_spent ?? 0;

  // Wait for the totals too, or the counts would read as none.
  if (contractorQuery.isLoading || workQuery.isLoading) {
    return <VendorDetailSkeleton />;
  }
  if (!contractor) {
    return (
      <p className='py-10 text-center text-sm text-gray-400'>
        This vendor could not be found.
      </p>
    );
  }

  return (
    <div className='mt-4 space-y-6'>
      <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-3 px-4 py-3'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 ring-1 ring-inset ring-purple-100'>
              <HardHat className='size-4 text-purple-600' />
            </div>
            <div className='min-w-0'>
              <div className='flex min-w-0 items-center gap-2'>
                <h2 className='truncate text-base font-semibold text-gray-900'>
                  {capitalFirstLetter(contractor.name)}
                </h2>
                <RecordCode code={contractor.code} />
              </div>
              <p className='text-xs text-gray-500'>
                {[
                  contractor.contact_number,
                  contractor.email,
                  contractor.address,
                  contractor.state && capitalizeEachWord(contractor.state),
                ]
                  .filter(Boolean)
                  .join(" · ") || "No contact details"}
              </p>
            </div>
          </div>
        </div>
        <div className='grid grid-cols-2 divide-x border-t bg-gray-50/60 sm:grid-cols-4'>
          <Summary
            label='GST'
            value={contractor.gst_number || "—"}
          />
          <Summary
            label='Orders'
            value={orderCount}
          />
          <Summary
            label='Job orders'
            value={jobOrderCount}
          />
          <Summary
            label='Spent with them'
            value={formatCurrency(totalSpent)}
          />
        </div>
      </div>

      <VendorExpensesSection contractorId={contractorId} />

      <VendorOrdersTable contractorId={contractorId} />
      <VendorJobOrdersTable contractorId={contractorId} />
    </div>
  );
};

export default ContractorDetail;
