"use client";
import React, { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import VendorFormDialog, { type SavedVendor } from "./vendor-form-dialog";

interface Props {
  // Handed the new vendor, with its code and name, so the form can choose
  // them.
  onAdded: (vendor: SavedVendor) => void;
  className?: string;
}

// Adds a vendor from a form that needs one not yet listed, without leaving it.
const NewVendorButton = ({ onAdded, className }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded text-xs font-medium text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
          className,
        )}>
        <Plus className='size-3.5' />
        New vendor
      </button>
      <VendorFormDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={onAdded}
      />
    </>
  );
};

export default NewVendorButton;
