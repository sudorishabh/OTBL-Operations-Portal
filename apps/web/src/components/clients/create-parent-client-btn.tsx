"use client";
import CustomButton from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";
import { Network } from "lucide-react";
import React from "react";

const CreateParentClientBtn = () => {
  const { setParam } = useHandleParams();

  return (
    <CustomButton
      text='Add Main Client'
      Icon={Network}
      onClick={() => setParam("dialog", "create-parent-client")}
      variant='outline'
      disableForViewer
    />
  );
};

export default CreateParentClientBtn;
