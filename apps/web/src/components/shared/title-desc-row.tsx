import { cn } from "@/lib/utils";
import React from "react";
import CustomIcon from "./icon";
import { Calendar, Clock, Edit, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { capitalFirstLetter } from "@pkg/utils";

interface IRowDetails {
  name: string;
  id: number;
  description: string;
  created_at: string;
  updated_at?: string;
  activity_type?: "insitu" | "exsitu" | "general";
  activity_sub_type?:
    | "zero_day_activity"
    | "zero_day_sample"
    | "tph_activity"
    | "oil_zapper_activity"
    | "other"
    | null;
}

interface Props {
  rowDetails: IRowDetails;
  setIsEditInfo: (
    isEditInfo: {
      id: number;
      name: string;
      description: string;
      activity_type?: "insitu" | "exsitu" | "general";
      activity_sub_type?:
        | "zero_day_activity"
        | "zero_day_sample"
        | "tph_activity"
        | "oil_zapper_activity"
        | "other"
        | null;
    } | null,
  ) => void;
  isDialog: boolean;
  setIsDialog: (isDialog: boolean) => void;
}

const TitleDescRow = ({
  isDialog,
  rowDetails,
  setIsDialog,
  setIsEditInfo,
}: Props) => {
  const handleEditClick = () => {
    setIsEditInfo({
      id: rowDetails.id,
      name: rowDetails.name,
      description: rowDetails.description,
      activity_type: rowDetails.activity_type,
      activity_sub_type: rowDetails.activity_sub_type,
    });
    setIsDialog(!isDialog);
  };

  return (
    <div
      className={cn(
        "group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ease-in-out",
        "hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20",
      )}
      role='listitem'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleEditClick();
        }
      }}>
      <div className='p-6'>
        <div className='flex items-start justify-between'>
          <div className='flex-1 min-w-0 pr-4'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-2 h-2 bg-[#035864] rounded-full flex-shrink-0 mt-1.5' />
              <h3 className='text-lg font-semibold text-gray-900 truncate'>
                {capitalFirstLetter(rowDetails.name)}
              </h3>
            </div>

            {rowDetails.description && (
              <p className='text-gray-600 text-sm leading-relaxed mb-3 line-clamp-2'>
                {capitalFirstLetter(rowDetails.description)}
              </p>
            )}

            <div className='flex flex-wrap items-center gap-4 text-xs text-gray-500'>
              {rowDetails.activity_type && (
                <div className='flex items-center gap-1'>
                  <span className='px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium'>
                    {rowDetails.activity_type === "insitu"
                      ? "In-Situ"
                      : rowDetails.activity_type === "exsitu"
                        ? "Ex-Situ"
                        : "General"}
                  </span>
                </div>
              )}
              {rowDetails.activity_sub_type && (
                <div className='flex items-center gap-1'>
                  <span className='px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium text-xs'>
                    {rowDetails.activity_sub_type
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1),
                      )
                      .join(" ")}
                  </span>
                </div>
              )}
              <div className='flex items-center gap-1'>
                <Calendar className='w-3 h-3' />
                <span>
                  Created: {format(rowDetails.created_at, "dd MMM, yyyy")}
                </span>
              </div>
              {rowDetails.updated_at &&
                rowDetails.updated_at !== rowDetails.created_at && (
                  <div className='flex items-center gap-1'>
                    <Clock className='w-3 h-3' />
                    <span>
                      Updated: {format(rowDetails.updated_at, "dd MMM, yyyy")}
                    </span>
                  </div>
                )}
            </div>
          </div>

          <div className='flex items-center gap-2 flex-shrink-0'>
            <button
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg",
                "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "transition-all duration-200 ease-in-out",
                "group-hover:bg-blue-100 group-hover:text-blue-800",
              )}
              onClick={handleEditClick}
              aria-label={`Edit sdfsfsd: ${rowDetails.name}`}
              type='button'>
              <CustomIcon
                Insert={Edit}
                size={16}
                className='transition-transform duration-200 group-hover:scale-110'
              />
              <span className='hidden sm:inline'>Edit</span>
            </button>

            <button
              className={cn(
                "p-2 text-gray-400 hover:text-gray-600 rounded-lg",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                "transition-all duration-200 ease-in-out",
              )}
              aria-label='More options'
              type='button'>
              <MoreVertical className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitleDescRow;
