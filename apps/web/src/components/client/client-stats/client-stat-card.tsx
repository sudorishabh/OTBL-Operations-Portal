import React from "react";

interface Props {
  Icon: React.ElementType;
  title: string;
  stat: string | number;
  openDialog?: boolean;
  setOpenDialog?: React.Dispatch<React.SetStateAction<boolean>>;
}

const OfficeStatCard = ({ Icon, stat, title, setOpenDialog }: Props) => {
  return (
    <div
      onClick={() => setOpenDialog?.(true)}
      className='rounded-xl border p-2.5 sm:p-4 bg-linear-to-br from-white to-gray-50 shadow hover:shadow-md transition-shadow hover:border-emerald-400 cursor-pointer'>
      <div className='flex items-center justify-between'>
        <div className='text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 text-gray-500'>
          <Icon className='size-3 sm:size-3.5 text-gray-600 shrink-0' />
          <span className='leading-tight'>{title}</span>
        </div>
      </div>
      <div className='mt-1 ml-4 sm:ml-5 text-base sm:text-xl font-semibold text-gray-700'>
        {stat}
      </div>
    </div>
  );
};

export default OfficeStatCard;
