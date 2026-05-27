"use client";
import React from "react";
import { Plus } from "lucide-react";
import CustomButton from "@/components/shared/btn";
import { useHandleParams } from "@/hooks/useHandleParams";
const CreateUserButton = () => {
  const { setParam } = useHandleParams();
  return (
    <CustomButton
      text='Create New User'
      Icon={Plus}
      variant='primary'
      onClick={() => setParam("dialog", "create-user")}
      disableForViewer
    />
  );
};

export default CreateUserButton;
