"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BuildingPatterns } from "./building-patterns";

interface Props {
  children: React.ReactNode;
  title?: string;
  description?: string;
  button?: React.ReactNode;
  backClick?: () => void;
}

export const PageWrapper = ({
  children,
  title,
  description,
  button,
  backClick,
}: Props) => {
  return (
    <div className='relative overflow-hidden py-4 px-3 sm:px-4 md:px-6 bg-gray-200/80 min-h-screen'>
      <BuildingPatterns />

      <div className='relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3 sm:gap-4 min-w-0'>
          {backClick && (
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

