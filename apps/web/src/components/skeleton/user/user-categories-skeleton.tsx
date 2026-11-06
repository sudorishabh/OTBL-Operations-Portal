import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonRegion, TableSkeleton, type SkeletonColumn } from "../parts";

const CATEGORIES = [
  "Office Manager Users",
  "Office Operator Users",
  "Site Operator Users",
  "Viewer Users",
];

const COLUMNS: SkeletonColumn[] = [
  {
    label: "Name",
    headClassName: "h-8 pl-7",
    cellClassName: "py-3",
    bar: ["w-24", "w-28", "w-20"],
  },
  {
    label: "Email",
    headClassName: "h-8",
    cellClassName: "py-2",
    bar: ["w-36", "w-32", "w-40"],
  },
  {
    label: "Contact",
    headClassName: "h-8",
    cellClassName: "py-2",
    bar: "w-20",
  },
];

// The categorised view: a card of eight users for each role.
const UserCategoriesSkeleton = () => (
  <SkeletonRegion
    label='Loading users'
    className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
    {CATEGORIES.map((title) => (
      <Card
        key={title}
        className='flex h-full flex-col gap-0 py-2.5'>
        <CardHeader className='mt-1 px-2.5'>
          <div className='ml-2 flex items-center justify-between'>
            <div>
              <CardTitle>{title}</CardTitle>
              <div className='flex h-4 items-center'>
                <Skeleton className='h-3 w-16' />
              </div>
            </div>
            <Skeleton className='size-8 rounded-full' />
          </div>
        </CardHeader>
        <CardContent className='mt-1 flex-1 px-2.5'>
          <TableSkeleton
            columns={COLUMNS}
            rows={8}
          />
        </CardContent>
      </Card>
    ))}
  </SkeletonRegion>
);

export default UserCategoriesSkeleton;
