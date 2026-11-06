"use client";
import React from "react";
import { RestorationPageSkeleton } from "@/components/skeleton/work-order/site-skeletons";
import RestorationPage from "@/components/work-order/restoration/restoration-page";

type PageProps = {
  params: Promise<{ workOrderId: string }>;
};

const WorkOrderRestorationPage = ({ params }: PageProps) => {
  const { workOrderId } = React.use(params);

  return (
    <React.Suspense fallback={<RestorationPageSkeleton />}>
      <RestorationPage
        workOrderId={workOrderId}
        from='list'
      />
    </React.Suspense>
  );
};

export default WorkOrderRestorationPage;
