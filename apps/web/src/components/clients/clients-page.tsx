"use client";
import React from "react";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import ClientSearchFilter from "./client-search-filter";
import ClientsSkeleton from "@/components/skeleton/clients/clients-skeleton";
import ScrollToTop from "@/components/scroll-to-top";

const ClientsTab = dynamic(() => import("./clients-tab"), {
  loading: () => <ClientsSkeleton />,
});
const CreateClientDialog = dynamic(() => import("./create-client-dialog"));
const ParentClientDialog = dynamic(() => import("./parent-client-dialog"));

// Main clients with their branches, and clients without a main client.
// Contact persons are kept on each main client and branch.
const ClientsPage = () => {
  return (
    <>
      <div className='mt-8 space-y-4'>
        <div className='mb-4'>
          <ClientSearchFilter />
        </div>
        <Suspense fallback={<ClientsSkeleton />}>
          <ClientsTab />
        </Suspense>
      </div>

      <CreateClientDialog />
      <ParentClientDialog />
      <ScrollToTop />
    </>
  );
};

export default ClientsPage;
