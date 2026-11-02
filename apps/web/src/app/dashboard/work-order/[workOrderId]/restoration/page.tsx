"use client";
import React from "react";
import PageLoading from "@/components/loading/PageLoading";
import RestorationPage from "@/components/work-order/restoration/restoration-page";

type PageProps = {
  params: Promise<{ workOrderId: string }>;
};

const WorkOrderRestorationPage = ({ params }: PageProps) => {
  const { workOrderId } = React.use(params);

  return (
    <React.Suspense fallback={<PageLoading />}>
      <RestorationPage
        workOrderId={workOrderId}
        from='list'
      />
    </React.Suspense>
  );
};

export default WorkOrderRestorationPage;
