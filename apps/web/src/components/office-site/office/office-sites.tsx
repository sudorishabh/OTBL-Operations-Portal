import React, { useState } from "react";
import { MapPinned, Plus } from "lucide-react";
import CustomButton from "@/components/shared/btn";
import ProcessSectionHeader from "@/components/work-order/process-section-header";
import {
  ALL,
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import useHandleParams from "@/hooks/useHandleParams";
import { useDebounce } from "@/hooks/useDebounce";
import OfficeSiteTable from "../office-site-table";
import type { OfficeDetails } from "./office-types";

const SITES_PAGE_SIZE = 10;

type SiteStatus = "all" | "active" | "inactive";

const STATUS_OPTIONS = [
  { label: "All sites", value: ALL },
  { label: "Active sites", value: "active" },
  { label: "Inactive sites", value: "inactive" },
];

// Every site of the office, searchable, with its work orders and edit
// options on each row.
const OfficeSites = ({ details }: { details: OfficeDetails }) => {
  const { office, sites, canManage } = details;
  const { setParams } = useHandleParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SiteStatus>(ALL);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const isFiltered = search !== "" || status !== ALL;

  return (
    <section className='rounded-lg border bg-white p-4 sm:p-6'>
      <ProcessSectionHeader
        Icon={MapPinned}
        title='Sites'
        description={
          sites.total === 0
            ? "No sites yet"
            : `${sites.total} ${sites.total === 1 ? "site" : "sites"}, ${sites.active} active`
        }>
        {canManage && (
          <CustomButton
            text='Create Site'
            variant='outline'
            Icon={Plus}
            onClick={() =>
              setParams({
                dialog: "create-site",
                officeId: String(office.id),
                officeName: office.name,
              })
            }
          />
        )}
      </ProcessSectionHeader>

      {sites.total > 0 && (
        <FilterBar className='mb-3'>
          <SearchFilter
            label='Search sites'
            placeholder='Search sites by name, address or city...'
            value={search}
            onChange={setSearch}
          />
          <SelectFilter
            label='Site status'
            value={status}
            onChange={(value) => setStatus(value as SiteStatus)}
            options={STATUS_OPTIONS}
          />
          {isFiltered && (
            <ClearFiltersButton
              onClick={() => {
                setSearch("");
                setStatus(ALL);
              }}
            />
          )}
        </FilterBar>
      )}

      <OfficeSiteTable
        officeId={office.id}
        officeName={office.name}
        status={status}
        searchQuery={debouncedSearch}
        pageSize={SITES_PAGE_SIZE}
        canManage={canManage}
      />
    </section>
  );
};

export default OfficeSites;
