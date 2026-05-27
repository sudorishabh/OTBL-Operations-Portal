"use client";
import React from "react";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { PencilLine } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import ClientInfoSkeleton from "@/components/skeleton/client/client-info-skeleton";
import ClientProposalSkeleton from "@/components/skeleton/client/client-proposal-skeleton";
const ClientDetailsCard = dynamic(
  () => import("@/components/client/client-details-card"),
);

const ProposalWOMain = dynamic(
  () =>
    import(
      "@/components/client/client-proposals-WO/proposal-wo/proposal-wo-main"
    ),
);

const UpdateClientDialog = dynamic(
  () => import("@/components/client/update-client-dialog"),
);

const ClientContent = ({ clientId }: { clientId: string }) => {
  const { setParam, getParam } = useHandleParams();
  const router = useRouter();

  return (
    <PageWrapper
      title={capitalFirstLetter(getParam("name") || "Client Info")}
      description='Manage Client Info and Work Orders'
      backClick={() => router.push("/dashboard/client")}
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
    </PageWrapper>
  );
};

export default ClientContent;
