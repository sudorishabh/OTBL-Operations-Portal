"use client";
import React from "react";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { recordTrail } from "@/lib/breadcrumbs";
import { PencilLine } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import CustomButton from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import ClientInfoSkeleton from "@/components/skeleton/client/client-info-skeleton";
import ClientProposalSkeleton from "@/components/skeleton/client/client-proposal-skeleton";
import ScrollToTop from "@/components/scroll-to-top";
const ClientDetailsCard = dynamic(
  () => import("@/components/client/client-details-card"),
  { loading: () => <ClientInfoSkeleton /> },
);

const ProposalWOMain = dynamic(
  () =>
    import(
      "@/components/client/client-proposals-WO/proposal-wo/proposal-wo-main"
    ),
  { loading: () => <ClientProposalSkeleton /> },
);

const UpdateClientDialog = dynamic(
  () => import("@/components/client/update-client-dialog"),
);

const ClientContent = ({ clientId }: { clientId: string }) => {
  const { setParam, getParam } = useHandleParams();
  const name = getParam("name");

  return (
    <PageWrapper
      title={name?.toUpperCase() || "Client Info"}
      description='Manage Client Info and Work Orders'
      breadcrumbs={recordTrail("clients", name || "Client")}
      button={
        <CustomButton
          text='Edit details'
          variant='primary'
          Icon={PencilLine}
          onClick={() => setParam("dialog", "update-client")}
          disableForViewer
        />
      }>
      <div className='mt-4 space-y-4'>
        <Suspense fallback={<ClientInfoSkeleton />}>
          <ClientDetailsCard clientId={clientId} />
        </Suspense>
        <Suspense fallback={<ClientProposalSkeleton />}>
          <ProposalWOMain clientId={clientId} />
        </Suspense>
      </div>
      <UpdateClientDialog clientId={clientId} />
      <ScrollToTop />
    </PageWrapper>
  );
};

export default ClientContent;
