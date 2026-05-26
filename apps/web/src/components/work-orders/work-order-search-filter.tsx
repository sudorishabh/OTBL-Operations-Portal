import CustomButton from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkOrderManagementContext } from "@/contexts/WorkOrderManagementContext";
import { Search, X } from "lucide-react";
import React from "react";
import { trpc } from "@/lib/trpc";

const WorkOrderSearchNFilter = () => {
  const { searchQuery, setSearchQuery, filters, setFilters, resetFilters } =
    useWorkOrderManagementContext();

  // Fetch all offices for the filter dropdown
  const { data: officeData } = trpc.officeQuery.getOffices.useQuery({});

  const hasActiveFilters =
    searchQuery !== "" ||
    filters.status !== "all" ||
    filters.office_id !== undefined;

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
      <div className='relative w-full sm:w-80 sm:flex-1 sm:max-w-md'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          type='text'
          placeholder='Search by code, title, agreement number, client, or office...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='pl-10 h-8 bg-white'
        />
      </div>
      <div className='flex flex-wrap items-center gap-2 sm:gap-3 text-xs'>
        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value })}>
          <SelectTrigger className='!h-8 w-[140px] bg-white text-xs cursor-pointer'>
            <SelectValue placeholder='All Status' />
          </SelectTrigger>
          <SelectContent className='text-xs'>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='completed'>Completed</SelectItem>
            <SelectItem value='cancelled'>Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Office Filter */}
        <Select
          value={filters.office_id?.toString() || "all"}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              office_id: value === "all" ? undefined : parseInt(value),
            })
          }>
          <SelectTrigger className='!h-8 w-[180px] bg-white text-xs cursor-pointer'>
            <SelectValue placeholder='All Offices' />
          </SelectTrigger>
          <SelectContent className='text-xs'>
            <SelectItem value='all'>All Offices</SelectItem>
            {officeData?.offices?.map((office: any) => (
              <SelectItem
                key={office.id}
                value={office.id.toString()}>
                {office.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset Button */}
        {hasActiveFilters && (
          <CustomButton
            text='Reset'
            onClick={resetFilters}
            variant='outline'
            Icon={X}
            className='h-8 text-xs'
          />
        )}
      </div>
    </div>
  );
};

export default WorkOrderSearchNFilter;
