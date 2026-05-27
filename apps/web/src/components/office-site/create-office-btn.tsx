"use client";
import Btn from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";
import { Plus } from "lucide-react";
import React from "react";

const CreateOfficeBtn = () => {
  const { setParam } = useHandleParams();
  return (
    <Btn
      text='Create New Office'
      Icon={Plus}
      variant='primary'
      onClick={() => setParam("dialog", "create-office")}
      disableForViewer
    />
  );
};

export default CreateOfficeBtn;
