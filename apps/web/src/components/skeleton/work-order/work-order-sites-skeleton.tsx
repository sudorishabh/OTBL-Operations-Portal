import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeaderSkeleton, SkeletonRegion, TextLine } from "../parts";

// Mirrors WOSitesCard: name and status, address, dates and operators, then
// the documents strip along the bottom.
const SiteCardSkeleton = () => (
  <div className='flex h-full flex-col rounded-lg border border-gray-200 bg-white'>
    <div className='flex items-start gap-3 px-4 pt-4'>
      <div className='min-w-0 flex-1'>
        <div className='flex h-5 items-center gap-2'>
          <Skeleton className='h-3.5 w-36' />
          <Skeleton className='h-4 w-14 rounded-full' />
        </div>
        <TextLine
          line='mt-1 h-4'
          className='w-56 max-w-full'
        />
      </div>
      <Skeleton className='mt-0.5 size-4 shrink-0' />
    </div>
    <div className='flex-1 space-y-1.5 px-4 pb-4 pt-3'>
      <TextLine
        line='h-4'
        className='w-44'
      />
      <TextLine
        line='h-4'
        className='w-32'
      />
    </div>
    <div className='flex items-center gap-1.5 rounded-b-lg border-t border-gray-100 bg-gray-50/60 px-4 py-2'>
      <Skeleton className='h-5 w-20' />
      <Skeleton className='h-5 w-16' />
      <Skeleton className='ml-auto h-2.5 w-16' />
    </div>
  </div>
);

// A grid of site cards, for the first page or the next one loading in.
export const SiteCardsSkeleton = ({ count = 3 }: { count?: number }) => (
  <SkeletonRegion
    label='Loading sites'
    className='grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 xl:grid-cols-3'>
    {Array.from({ length: count }, (_, index) => (
      <SiteCardSkeleton key={index} />
    ))}
  </SkeletonRegion>
);

// The bioremediation section of a work order: header, tabs with their
// actions, and the site cards.
const BioremediationSectionSkeleton = () => (
  <SkeletonRegion label='Loading sites'>
    <section className='rounded-lg border bg-white p-6'>
      <SectionHeaderSkeleton
        title='Bioremediation'
        description='Done site by site, through purchase orders and sub-contracts'
      />
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Skeleton className='h-8 w-[21rem] max-w-full' />
        <div className='flex flex-wrap items-center gap-2'>
          <Skeleton className='h-8 w-36' />
          <Skeleton className='h-8 w-28' />
        </div>
      </div>
      <div className='mt-4 grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 3 }, (_, index) => (
          <SiteCardSkeleton key={index} />
        ))}
      </div>
    </section>
  </SkeletonRegion>
);

export default BioremediationSectionSkeleton;
