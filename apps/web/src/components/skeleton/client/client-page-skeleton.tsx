import React from "react";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { PageHeaderSkeleton } from "../parts";
import ClientInfoSkeleton from "./client-info-skeleton";
import ClientProposalSkeleton from "./client-proposal-skeleton";

// A client's page before it mounts: the title row, details card and
// proposals, on the same backdrop the page draws.
const ClientPageSkeleton = () => (
  <PageWrapper>
    <PageHeaderSkeleton
      back
      description='Manage Client Info and Work Orders'
      action
    />
    <div className='mt-4 space-y-4'>
      <ClientInfoSkeleton />
      <ClientProposalSkeleton />
    </div>
  </PageWrapper>
);

export default ClientPageSkeleton;
