"use client";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PageBreadcrumbs, {
  type Crumb,
} from "@/components/shared/page-breadcrumbs";
import { BuildingPatterns } from "./building-patterns";

interface Props {
  children: React.ReactNode;
  title?: string;
  description?: string;
  button?: React.ReactNode;
  backClick?: () => void;
  // The trail from home to this page, drawn above the title.
  breadcrumbs?: Crumb[];
}

export const PageWrapper = ({
  children,
  title,
  description,
  button,
  backClick,
  breadcrumbs,
}: Props) => {
  // The step above this page, where the back arrow leads.
  const parent = breadcrumbs?.[breadcrumbs.length - 2];

  return (
    <div className='relative overflow-hidden py-4 px-3 sm:px-4 md:px-6 bg-gray-200/80 min-h-screen'>
      <BuildingPatterns />

      {breadcrumbs && (
        <div className='relative z-10 mb-3 flex items-center gap-2'>
          {parent?.href && (
            <Link
              href={parent.href}
              aria-label={`Back to ${parent.label}`}
              title={`Back to ${parent.label}`}
              className='flex size-7 shrink-0 items-center justify-center rounded-full bg-white/75 text-gray-600 shadow-sm ring-1 ring-gray-300/60 backdrop-blur-sm transition-colors hover:bg-white hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40'>
              <ArrowLeft className='size-3.5' />
            </Link>
          )}
          <PageBreadcrumbs items={breadcrumbs} />
        </div>
      )}

      <div className='relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3 sm:gap-4 min-w-0'>
          {backClick && !parent?.href && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='bg-white hover:bg-gray-50 shadow/5 hover:shadow cursor-pointer rounded-full size-8 shrink-0 transition-all duration-300'
              aria-label='Go back'
              onClick={backClick}>
              <ArrowLeft className='size-4' />
            </Button>
          )}
          <div className='min-w-0'>
            {title && (
              <h1 className='text-lg sm:text-xl font-bold text-cyan-800 truncate'>
                {title}
              </h1>
            )}
            {description && (
              <p className='text-xs sm:text-sm text-gray-500 font-medium line-clamp-2'>
                {description}
              </p>
            )}
          </div>
        </div>
        {button && <div className='shrink-0'>{button}</div>}
      </div>
      <div className='relative z-10'>{children}</div>
    </div>
  );
};

