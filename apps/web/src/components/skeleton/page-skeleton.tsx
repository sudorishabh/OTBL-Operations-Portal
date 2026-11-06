import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import {
  FilterBarSkeleton,
  PageHeaderSkeleton,
  SkeletonCard,
  SkeletonRegion,
} from "./parts";

// A list page in general: filters over a card of rows.
const GenericListSkeleton = () => (
  <SkeletonRegion
    label='Loading'
    className='mt-8'>
    <FilterBarSkeleton className='mb-4' />
    <SkeletonCard>
      <div className='h-12 border-b bg-gray-50/60' />
      <div className='divide-y divide-gray-100'>
        {["w-48", "w-64", "w-56", "w-40", "w-60", "w-52"].map((width) => (
          <div
            key={width}
            className='flex h-16 items-center gap-8 px-4'>
            <Skeleton className={`h-3.5 ${width}`} />
            <Skeleton className='h-3.5 w-32' />
            <Skeleton className='ml-auto h-5 w-16 rounded-full' />
          </div>
        ))}
      </div>
    </SkeletonCard>
  </SkeletonRegion>
);

// A dashboard page before it can render, such as while the route guard
// checks who is signed in. With a title, the page's own header shows.
const PageSkeleton = ({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) => (
  <PageWrapper
    title={title}
    description={description}>
    {!title && (
      <SkeletonRegion label='Loading'>
        <PageHeaderSkeleton />
      </SkeletonRegion>
    )}
    {children ?? <GenericListSkeleton />}
  </PageWrapper>
);

export default PageSkeleton;
