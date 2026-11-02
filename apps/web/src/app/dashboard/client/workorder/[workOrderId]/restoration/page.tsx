"use client";
import React from "react";
import PageLoading from "@/components/loading/PageLoading";
import RestorationPage from "@/components/work-order/restoration/restoration-page";

type PageProps = {
  params: Promise<{ workOrderId: string }>;
};

const ClientWorkOrderRestorationPage = ({ params }: PageProps) => {
  const { workOrderId } = React.use(params);

  return (
    <React.Suspense fallback={<PageLoading />}>
      <RestorationPage
        workOrderId={workOrderId}
        from='client'
      />
    </React.Suspense>
  );
};

export default ClientWorkOrderRestorationPage;
