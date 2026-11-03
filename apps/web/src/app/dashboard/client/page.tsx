import { PageWrapper } from "@/components/wrapper/page-wrapper";
import React, { Suspense } from "react";
import CreateClientButton from "@/components/clients/create-client-btn";
import CreateParentClientButton from "@/components/clients/create-parent-client-btn";
import ClientsPage from "@/components/clients/clients-page";
import ClientsPageSkeleton from "@/components/skeleton/clients/clients-page-skeleton";

const page = () => {
  return (
    <PageWrapper
      title='Clients'
      description='Manage and monitor all your clients, their branches and contacts'
      button={
        <Suspense fallback={null}>
          <div className='flex items-center gap-2'>
            <CreateParentClientButton />
            <CreateClientButton />
          </div>
        </Suspense>
      }>
      <Suspense fallback={<ClientsPageSkeleton />}>
        <ClientsPage />
      </Suspense>
    </PageWrapper>
  );
};

export default page;
