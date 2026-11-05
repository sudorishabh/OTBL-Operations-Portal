"use client";
import Btn from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";
import { Plus } from "lucide-react";
import React from "react";

const CreateVendorBtn = () => {
  const { setParam } = useHandleParams();
  return (
    <Btn
      text='Add Vendor'
      Icon={Plus}
      variant='primary'
      onClick={() => setParam("dialog", "create-vendor")}
      disableForViewer
    />
  );
};

export default CreateVendorBtn;
