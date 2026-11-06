import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import {
  DetailCardSkeleton,
  PageHeaderSkeleton,
  SkeletonRegion,
} from "../parts";
import BioremediationSectionSkeleton from "./work-order-sites-skeleton";

// A work order's page: title row, the details card with its five figures
// and seven fields, the dialog buttons, then a process section.
const WorkOrderDetailsSkeleton = () => (
  <PageWrapper>
    <SkeletonRegion label='Loading work order'>
      <PageHeaderSkeleton
        back
        description='Work Order Details and Management'
      />
      <div className='mt-4 space-y-4'>
        <DetailCardSkeleton
          pills={3}
          buttons={2}
          pillsOwnRow
          metrics={5}
          metricsClassName='sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0'
          fields={Array.from({ length: 7 }, () => "")}
          fieldsClassName='sm:grid-cols-4 xl:grid-cols-7'
          notes
        />
        <div className='flex flex-wrap justify-end gap-2'>
          <Skeleton className='h-8 w-48 bg-white/80' />
          <Skeleton className='h-8 w-36 bg-white/80' />
          <Skeleton className='h-8 w-44 bg-white/80' />
        </div>
        <BioremediationSectionSkeleton />
      </div>
    </SkeletonRegion>
  </PageWrapper>
);

export default WorkOrderDetailsSkeleton;
