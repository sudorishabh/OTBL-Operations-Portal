import { PageWrapper } from "@/components/wrapper/page-wrapper";
import React, { Suspense } from "react";
import CreateClientButton from "@/components/clients/create-client-btn";
import ClientsPage from "@/components/clients/clients-page";
import ClientsPageSkeleton from "@/components/skeleton/clients/clients-page-skeleton";

const page = () => {
  return (
    <PageWrapper
      title='Clients'
      description='Manage and monitor all your clients and their contacts'
      button={
        <Suspense fallback={null}>
          <CreateClientButton />
        </Suspense>
      }>
      <Suspense fallback={<ClientsPageSkeleton />}>
        <ClientsPage />
      </Suspense>
    </PageWrapper>
  );
};

export default page;
