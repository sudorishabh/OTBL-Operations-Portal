"use client";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { keepPreviousData } from "@tanstack/react-query";
import { Network } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { capitalizeEachWord } from "@pkg/utils";
import { clientTypes } from "@pkg/schema";
import { ALL, ComboboxFilter } from "@/components/filters/list-filters";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type ParentClientOption = Pick<
  clientTypes.parentClientType,
  "id" | "name" | "code"
>;

const toOption = (parent: ParentClientOption) => ({
  value: String(parent.id),
  label: capitalizeEachWord(parent.name),
  hint: parent.code ?? undefined,
});

// Shared by the create and update client dialogs; reads the surrounding
// <Form>. Main clients are many, so they are searched on the server, a few at
// a time; none picked makes a standalone client.
const ParentClientField = () => {
  const { control, watch } = useFormContext<{
    parent_client_id?: number | null;
  }>();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const selectedId = watch("parent_client_id") ?? undefined;

  const optionsQuery = trpc.clientQuery.findParentClientOptions.useQuery(
    { search: debouncedSearch || undefined, selected_id: selectedId },
    { placeholderData: keepPreviousData },
  );
  const options = (
    (optionsQuery.data?.parentClients ?? []) as ParentClientOption[]
  ).map(toOption);
  const selected = optionsQuery.data?.selected
    ? toOption(optionsQuery.data.selected as ParentClientOption)
    : undefined;

  return (
    <FormField
      control={control}
      name='parent_client_id'
      render={({ field }) => (
        <FormItem className='space-y-1'>
          <FormLabel className='flex items-center gap-2 text-xs font-medium text-neutral-700'>
            <Network className='size-3.5 text-neutral-400' />
            <span>Main Client</span>
            <span className='text-xs font-normal text-neutral-400'>
              (Optional)
            </span>
          </FormLabel>
          <FormControl>
            <ComboboxFilter
              appearance='field'
              label='Main client'
              allLabel='None (standalone client)'
              value={field.value ? String(field.value) : ALL}
              onChange={(value) =>
                field.onChange(value === ALL ? null : Number(value))
              }
              options={options}
              isLoading={optionsQuery.isLoading}
              searchPlaceholder='Search main clients by code or name...'
              onSearchChange={setSearch}
              selectedOption={selected}
              hasMore={!!optionsQuery.data?.has_more}
            />
          </FormControl>
          <FormMessage className='text-xs' />
        </FormItem>
      )}
    />
  );
};

export default ParentClientField;
