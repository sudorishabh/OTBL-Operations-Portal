"use client";
import React from "react";
import useHandleParams from "@/hooks/useHandleParams";
import VendorFormDialog from "./vendor-form-dialog";
import type { ContractorType } from "./contractor-labels";

// The vendors page's dialog: dialog=create-vendor adds a vendor and
// dialog=edit-vendor&vendorId=… edits one.
const VendorDialog = ({ type }: { type: ContractorType }) => {
  const { getParam, deleteParams } = useHandleParams();
  const dialog = getParam("dialog");
  const isEdit = dialog === "edit-vendor";

  return (
    <VendorFormDialog
      open={isEdit || dialog === "create-vendor"}
      onOpenChange={(open) => {
        if (!open) deleteParams(["dialog", "vendorId"]);
      }}
      vendorId={isEdit ? Number(getParam("vendorId")) : undefined}
      type={type}
    />
  );
};

export default VendorDialog;
