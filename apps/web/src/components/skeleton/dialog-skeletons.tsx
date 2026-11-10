import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard, SkeletonRegion, TextLine } from "./parts";

// Bodies for dialogs whose content is still loading. Dialogs differ, so
// these keep to the common shapes: a form, a list or a page of details.

// Labelled fields in two columns, as the edit forms lay them out.
export const FormSkeleton = ({ fields = 6 }: { fields?: number }) => (
  <SkeletonRegion
    label='Loading the form'
    className='grid grid-cols-1 gap-x-4 gap-y-5 py-2 sm:grid-cols-2'>
    {Array.from({ length: fields }, (_, index) => (
      <div
        key={index}
        className='space-y-2'>
        <TextLine
          line='h-5'
          className={
            index % 3 === 0 ? "w-28" : index % 3 === 1 ? "w-20" : "w-24"
          }
        />
        <Skeleton className='h-9 w-full' />
      </div>
    ))}
  </SkeletonRegion>
);

// Rows in a bordered box under a header row.
export const ListSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <SkeletonRegion
    label='Loading'
    className='py-2'>
    <SkeletonCard>
      <div className='flex h-10 items-center gap-8 border-b bg-gray-50/60 px-4'>
        <Skeleton className='h-2.5 w-20' />
        <Skeleton className='h-2.5 w-24' />
        <Skeleton className='ml-auto h-2.5 w-16' />
      </div>
      <div className='divide-y divide-gray-100'>
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className='flex h-14 items-center gap-8 px-4'>
            <div className='min-w-0 flex-1 space-y-1.5'>
              <Skeleton
                className={`h-3.5 ${index % 2 ? "w-48" : "w-64"} max-w-full`}
              />
              <Skeleton className='h-3 w-32' />
            </div>
            <Skeleton className='hidden h-3.5 w-24 sm:block' />
            <Skeleton className='h-3.5 w-20' />
          </div>
        ))}
      </div>
    </SkeletonCard>
  </SkeletonRegion>
);

// A record's details: a heading over a grid of label and value pairs.
export const DetailsSkeleton = () => (
  <SkeletonRegion
    label='Loading the details'
    className='space-y-4 p-1'>
    {[6, 4].map((fields, card) => (
      <SkeletonCard
        key={card}
        className='rounded-xl p-6 shadow-sm'>
        <TextLine
          line='h-6'
          className='h-4 w-56'
        />
        <div className='mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2'>
          {Array.from({ length: fields }, (_, index) => (
            <div key={index}>
              <TextLine
                line='h-4'
                className='w-20'
              />
              <TextLine
                line='mt-1 h-5'
                className='h-3.5 w-40'
              />
            </div>
          ))}
        </div>
      </SkeletonCard>
    ))}
  </SkeletonRegion>
);
