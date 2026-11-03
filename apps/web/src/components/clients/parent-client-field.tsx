"use client";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Network } from "lucide-react";
import Input from "@/components/shared/input";
import { trpc } from "@/lib/trpc";
import { capitalizeEachWord } from "@pkg/utils";
import { clientTypes } from "@pkg/schema";

// Select items can't hold an empty value, so "no main client" gets a sentinel.
const NO_PARENT = "none";

type ParentClientOption = Pick<clientTypes.parentClientType, "id" | "name">;

// Shared by the create and update client dialogs; reads the surrounding <Form>.
const ParentClientField = () => {
  const { control } = useFormContext<{ parent_client_id?: number | null }>();
  const { data: parentClients } = trpc.clientQuery.getParentClients.useQuery();

  const options = [
    { label: "None (standalone client)", value: NO_PARENT },
    ...((parentClients ?? []) as ParentClientOption[]).map((parent) => ({
      label: capitalizeEachWord(parent.name),
      value: String(parent.id),
    })),
  ];

  return (
    <Input
      control={control}
      fieldName='parent_client_id'
      Label='Main Client'
      LabelIcon={Network}
      isSelect
      selectOptions={options}
      formatDisplay={(value) => (value ? String(value) : NO_PARENT)}
      parseValue={(value) => (value === NO_PARENT ? null : Number(value))}
      optional
    />
  );
};

export default ParentClientField;
