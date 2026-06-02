import React from "react";
import CustomIcon from "./icon";

interface Props {
  Icon: React.ElementType;
  title: string;
  description: string;
}

const NoFetchData = ({ Icon, title, description }: Props) => {
  return (
    <div className='flex flex-col items-center justify-center min-h-72 p-8 mt-10 bg-white border border-gray-100 rounded-md shadow'>
      <div className='flex items-center justify-center size-12 mb-6 bg-white  rounded-full shadow-md border border-gray-100'>
        <CustomIcon
          Insert={Icon}
          size={20}
          className='text-gray-500'
        />
      </div>

      <div className='text-center max-w-sm'>
        <h3 className='text- font-semibold text-gray-900 tracking-tight'>
          {title}
        </h3>

        <p className='text-sm text-gray-600 leading-relaxed'>{description}</p>

        <div className='inline-flex items-center px-3 py-1 mt-5 rounded-full bg-gray-100 border border-gray-200'>
          <div className='w-2 h-2 bg-gray-400 rounded-full mr-2'></div>
          <span className='text-xs font-medium text-gray-700'>
            No data available
          </span>
        </div>
      </div>
    </div>
  );
};

export default NoFetchData;
