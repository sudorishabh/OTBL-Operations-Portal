import React from "react";
import { Search, X } from "lucide-react";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PROCESSES,
  PROPOSAL_STATUSES,
  type ProposalStatus,
} from "./proposal-wo-display";
import {
  WORK_ORDER_FILTERS,
  type ProposalFilters,
  type WorkOrderFilter,
} from "./use-proposal-filters";
import SubmittedDateFilter from "./submitted-date-filter";

const PROPOSAL_STATUS_OPTIONS = [
  { label: "All proposals", value: "all" },
  ...Object.entries(PROPOSAL_STATUSES).map(([value, { label }]) => ({
    label,
    value,
  })),
];

const PROCESS_OPTIONS = [
  { label: "All processes", value: "all" },
  ...Object.entries(PROCESSES).map(([value, { label }]) => ({ label, value })),
];

interface Props {
  filters: ProposalFilters;
  counts: Record<WorkOrderFilter, number>;
  setFilter: <K extends keyof ProposalFilters>(
    key: K,
    value: ProposalFilters[K],
  ) => void;
  isFiltered: boolean;
  reset: () => void;
}

// One line: work order tabs with how many rows each holds on the left;
// search, the proposal's approval status and submission dates, and the
// work order's process on the right. Wraps on narrow screens.
const ProposalWOFilters = ({
  filters,
  counts,
  setFilter,
  isFiltered,
  reset,
}: Props) => (
  <div className='mb-3 flex flex-wrap items-center gap-2'>
    <Tabs
      value={filters.workOrder}
      onValueChange={(value) =>
        setFilter("workOrder", value as WorkOrderFilter)
      }
      className='min-w-0 max-w-full'>
      <TabsList className='h-8 max-w-full overflow-x-auto'>
        {WORK_ORDER_FILTERS.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className='gap-1.5 px-3 text-xs text-gray-800'>
            {label}
            <span className='tabular-nums text-gray-400'>{counts[value]}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>

    <div className='ml-auto flex flex-wrap items-center gap-2'>
      <div className='w-full sm:w-52'>
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
      <Input
        mode='standalone'
        isSelect
        isWhiteBg
        selectOptions={PROPOSAL_STATUS_OPTIONS}
        value={filters.proposalStatus}
        onChange={(value: string) =>
          setFilter("proposalStatus", value as ProposalStatus | "all")
        }
        className='h-8! w-36 text-xs'
      />
      <SubmittedDateFilter
        from={filters.submittedFrom}
        to={filters.submittedTo}
        onChange={(from, to) => {
          setFilter("submittedFrom", from);
          setFilter("submittedTo", to);
        }}
      />
      <Input
        mode='standalone'
        isSelect
        isWhiteBg
        selectOptions={PROCESS_OPTIONS}
        value={filters.process}
        onChange={(value: string) =>
          setFilter("process", value as ProposalFilters["process"])
        }
        className='h-8! w-40 text-xs'
      />
      {isFiltered && (
        <CustomButton
          text='Reset'
          variant='outline'
          Icon={X}
          onClick={reset}
          className='h-8 text-xs'
        />
      )}
    </div>
  </div>
);

export default ProposalWOFilters;
