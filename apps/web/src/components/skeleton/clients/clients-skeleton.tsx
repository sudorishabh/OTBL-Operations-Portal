"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/contexts/AuthContext";
import { SkeletonRegion, TextLine } from "../parts";

// Mirrors BranchRow: tree elbow, name and address, contact lines, then
// counts, contacts and the chevron.
const BranchRowSkeleton = ({ isLast }: { isLast: boolean }) => (
  <li className='relative pl-10'>
    <span className='absolute left-[18px] top-0 h-1/2 w-[22px] rounded-bl-md border-b border-l border-gray-300' />
    {!isLast && (
      <span className='absolute bottom-0 left-[18px] top-1/2 border-l border-gray-300' />
    )}
    <div className='grid grid-cols-1 items-center gap-x-4 gap-y-2 px-3 py-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]'>
      <div className='min-w-0'>
        <div className='flex h-5 items-center gap-2'>
          <Skeleton className='h-3.5 w-44' />
          <Skeleton className='h-3 w-12 rounded-full' />
        </div>
        <TextLine
          line='mt-0.5 h-4'
          className='w-72 max-w-full'
        />
      </div>
      <div className='min-w-0'>
        <TextLine
          line='h-4'
          className='w-20'
        />
        <TextLine
          line='h-4'
          className='w-44 max-w-full'
        />
      </div>
      <div className='flex items-center gap-3 lg:justify-end'>
        <Skeleton className='h-3 w-20' />
        <Skeleton className='h-3 w-16' />
        <Skeleton className='h-3 w-12' />
        <Skeleton className='ml-auto h-7 w-24 lg:ml-1' />
        <Skeleton className='size-4' />
      </div>
    </div>
  </li>
);

// Mirrors ParentClientGroup: the main client's details, contacts and actions
// over its branches.
export const ClientGroupSkeleton = ({
  branches = 1,
  isAdmin,
}: {
  branches?: number;
  isAdmin: boolean;
}) => (
  <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
    <div className='grid grid-cols-1 items-center gap-x-4 gap-y-2 px-4 pb-1 pt-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]'>
      <div className='flex min-w-0 items-center gap-3'>
        <Skeleton className='size-9 shrink-0 rounded-lg' />
        <div className='min-w-0'>
          <div className='flex h-[22.5px] items-center gap-2'>
            <Skeleton className='h-4 w-56 max-w-full' />
            <Skeleton className='h-3 w-12 rounded-full' />
          </div>
          <TextLine
            line='h-4'
            className='w-64 max-w-full'
          />
        </div>
        <Skeleton className='size-4 shrink-0' />
      </div>
      <div className='min-w-0 pl-12 lg:pl-0'>
        <TextLine
          line='h-4'
          className='w-20'
        />
        <TextLine
          line='h-4'
          className='w-44 max-w-full'
        />
      </div>
      <div className='flex items-center gap-2 sm:pl-12 lg:pl-0'>
        <Skeleton className='h-8 w-24' />
        {isAdmin && (
          <>
            <Skeleton className='h-8 w-28' />
            <Skeleton className='size-8' />
            <Skeleton className='size-8' />
          </>
        )}
      </div>
    </div>
    <ul className='px-4 pb-3'>
      {Array.from({ length: branches }, (_, index) => (
        <BranchRowSkeleton
          key={index}
          isLast={index === branches - 1}
        />
      ))}
    </ul>
  </div>
);

// The client list: main clients, each with its branches.
const ClientsSkeleton = () => {
  const isAdmin = useIsAdmin();
  return (
    <SkeletonRegion
      label='Loading clients'
      className='space-y-4'>
      {[1, 2, 1, 1].map((branches, index) => (
        <ClientGroupSkeleton
          key={index}
          branches={branches}
          isAdmin={isAdmin}
        />
      ))}
    </SkeletonRegion>
  );
};

export default ClientsSkeleton;
