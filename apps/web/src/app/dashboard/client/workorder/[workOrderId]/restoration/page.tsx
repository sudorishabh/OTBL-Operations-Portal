"use client";
import React from "react";
import { RestorationPageSkeleton } from "@/components/skeleton/work-order/site-skeletons";
import RestorationPage from "@/components/work-order/restoration/restoration-page";

type PageProps = {
  params: Promise<{ workOrderId: string }>;
};

const ClientWorkOrderRestorationPage = ({ params }: PageProps) => {
  const { workOrderId } = React.use(params);

  return (
    <React.Suspense fallback={<RestorationPageSkeleton />}>
      <RestorationPage
        workOrderId={workOrderId}
        from='client'
      />
    </React.Suspense>
  );
};

export default ClientWorkOrderRestorationPage;
