import React from "react";
import CustomButton from "../shared/btn";
import { cn } from "@/lib/utils";

interface Props {
  onClick: () => void;
  loading: boolean;
  className?: string;
}

const LoadMoreBtn = ({ loading, onClick, className }: Props) => {
  return (
    <div className={cn("flex justify-center pt-6", className)}>
      <CustomButton
        text='Load More'
        variant='outline'
        onClick={onClick}
        disabled={loading}
        loading={loading}
      />
    </div>
  );
};

export default LoadMoreBtn;
