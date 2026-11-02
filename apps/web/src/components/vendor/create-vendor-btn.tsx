"use client";
import Btn from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";
import { Plus } from "lucide-react";
import React from "react";
import { CONTRACTOR_LABELS, type ContractorType } from "./contractor-labels";

const CreateVendorBtn = ({ type }: { type: ContractorType }) => {
  const { setParam } = useHandleParams();
  return (
    <Btn
      text={`Add ${CONTRACTOR_LABELS[type].one}`}
      Icon={Plus}
      variant='primary'
      onClick={() => setParam("dialog", "create-vendor")}
      disableForViewer
    />
  );
};

export default CreateVendorBtn;
