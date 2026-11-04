import React from "react";
import { Search } from "lucide-react";
import Input from "@/components/shared/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  WORK_ORDER_FILTERS,
  type ProposalFilters,
  type WorkOrderFilter,
} from "./use-proposal-filters";

interface Props {
  filters: ProposalFilters;
  counts: Record<WorkOrderFilter, number>;
  setFilter: <K extends keyof ProposalFilters>(
    key: K,
    value: ProposalFilters[K],
  ) => void;
}

// Work order tabs with how many rows each holds, and a search box.
const ProposalWOFilters = ({ filters, counts, setFilter }: Props) => (
  <div className='mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
    <Tabs
      value={filters.workOrder}
      onValueChange={(value) =>
        setFilter("workOrder", value as WorkOrderFilter)
      }
      className='min-w-0'>
      <div className='flex min-w-0 items-center gap-2'>
        <span className='shrink-0 text-xs text-gray-500'>Work order</span>
        <div className='min-w-0 overflow-x-auto'>
          <TabsList className='h-8'>
            {WORK_ORDER_FILTERS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className='gap-1.5 px-3 text-xs text-gray-800'>
                {label}
                <span className='tabular-nums text-gray-400'>
                  {counts[value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
    </Tabs>

    <div className='w-full lg:w-64'>
      <Input
        mode='standalone'
        type='text'
        isWhiteBg
        placeholder='Search code or title'
        value={filters.search}
        onChange={(value: string) => setFilter("search", value)}
        inputIcon={Search}
        className='h-8 text-xs'
      />
    </div>
  </div>
);

export default ProposalWOFilters;
