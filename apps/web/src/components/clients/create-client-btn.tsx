"use client";
import CustomButton from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";
import { Plus } from "lucide-react";
import React from "react";

const CreateClientBtn = () => {
  const { setParam } = useHandleParams();

  return (
    <CustomButton
      text='Add Client'
      Icon={Plus}
      onClick={() => setParam("dialog", "create-client")}
      variant='primary'
      disableForViewer
    />
  );
};

export default CreateClientBtn;
