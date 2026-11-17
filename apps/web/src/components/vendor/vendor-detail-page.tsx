"use client";
import React from "react";
import { capitalFirstLetter } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { recordTrail } from "@/lib/breadcrumbs";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import ContractorDetail from "./contractor-detail";

// A vendor's own page, its trail naming the vendor once they load. The
// details below ask for the same vendor, so this makes no request of its own.
const VendorDetailPage = ({ contractorId }: { contractorId: number }) => {
  const { data } = trpc.contractorQuery.getContractor.useQuery({
    id: contractorId,
  });
  const name = data?.contractor?.name;

  return (
    <PageWrapper
      title='Vendor'
      description='Every order and job order this vendor is on'
      breadcrumbs={recordTrail(
        "vendors",
        name ? capitalFirstLetter(name) : "Vendor",
      )}>
      <ContractorDetail contractorId={contractorId} />
    </PageWrapper>
  );
};

export default VendorDetailPage;
