import React from "react";
import { KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SkeletonRegion, TextLine } from "../parts";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className='mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'>
    {children}
  </p>
);

// Mirrors the profile's InfoRow: icon tile, label, then the value.
const InfoRowSkeleton = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className='flex items-center gap-3 px-4 py-3'>
    <Skeleton className='size-7 shrink-0' />
    <div className='min-w-0 flex-1'>
      <p className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      <TextLine
        line='mt-0.5 h-5'
        className={`h-3.5 ${value}`}
      />
    </div>
  </div>
);

// The profile page while the account loads: who you are, your details and
// the password form, with their headings in place.
const ProfileSkeleton = () => (
  <SkeletonRegion
    label='Loading your profile'
    className='mt-6 flex max-w-2xl flex-col gap-4'>
    <Card className='border-cyan-900/10 shadow-sm'>
      <CardContent className='p-5'>
        <div className='flex items-center gap-4'>
          <Skeleton className='size-14 shrink-0 rounded-full' />
          <div className='min-w-0 flex-1'>
            <TextLine
              line='h-6'
              className='h-4 w-40'
            />
            <div className='mt-1 flex items-center gap-1.5'>
              <Skeleton className='h-5 w-12' />
              <Skeleton className='h-5 w-12' />
            </div>
          </div>
          <div className='hidden shrink-0 flex-col items-end sm:flex'>
            <p className='text-[10px] font-semibold uppercase tracking-widest text-muted-foreground'>
              Member since
            </p>
            <TextLine
              line='mt-0.5 h-4'
              className='w-20'
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <div>
      <SectionLabel>Account details</SectionLabel>
      <Card className='border-cyan-900/10 shadow-sm'>
        <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0 px-5 pb-3 pt-4'>
          <div>
            <CardTitle className='text-sm font-semibold text-cyan-900'>
              Personal information
            </CardTitle>
            <CardDescription className='mt-0.5 text-xs'>
              Your name, email, and contact number as stored in OTBL.
            </CardDescription>
          </div>
          <Skeleton className='h-7 w-16 shrink-0' />
        </CardHeader>
        <CardContent className='px-5 pb-5'>
          <div className='divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 bg-gray-50/50'>
            <InfoRowSkeleton
              label='Name'
              value='w-36'
            />
            <InfoRowSkeleton
              label='Email'
              value='w-48'
            />
            <InfoRowSkeleton
              label='Contact'
              value='w-28'
            />
          </div>
        </CardContent>
      </Card>
    </div>

    <div>
      <SectionLabel>Security</SectionLabel>
      <Card className='border-cyan-900/10 shadow-sm'>
        <CardHeader className='px-5 pb-3 pt-4'>
          <CardTitle className='flex items-center gap-2 text-sm font-semibold text-cyan-900'>
            <KeyRound className='h-4 w-4' />
            Change password
          </CardTitle>
          <CardDescription className='mt-0.5 text-xs'>
            Use a strong password you do not reuse on other sites.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 px-5 pb-5'>
          {["w-28", "w-24", "w-36"].map((width) => (
            <div
              key={width}
              className='space-y-2'>
              <TextLine
                line='h-5'
                className={width}
              />
              <Skeleton className='h-9 w-full' />
            </div>
          ))}
          <div className='flex justify-end pt-1'>
            <Skeleton className='h-8 w-36' />
          </div>
        </CardContent>
      </Card>
    </div>
  </SkeletonRegion>
);

export default ProfileSkeleton;
