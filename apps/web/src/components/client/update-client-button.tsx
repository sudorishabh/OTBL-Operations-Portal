"use client";
import CustomButton from "@/components/shared/btn";
import useHandleParams from "@/hooks/useHandleParams";
import { PencilLine } from "lucide-react";
import React from "react";

const UpdateClientButton = () => {
  return (
    <CustomButton
      text='Edit details'
      variant='primary'
      Icon={PencilLine}
      disableForViewer
    />
  );
};

export default UpdateClientButton;
