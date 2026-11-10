"use client";
import React from "react";
import { ArrowUpDown, Landmark, UserCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import {
  useUserManagementContext,
  type UserFilters,
  type UserSort,
} from "@/contexts/UserManagementContext";

type OfficeOption = { id: number; name: string; city: string; state: string };

const ROLE_OPTIONS = [
  { label: "All roles", value: ALL },
  { label: "Office Manager", value: "office_manager" },
  { label: "Office Operator", value: "office_operator" },
  { label: "Site Operator", value: "site_operator" },
  { label: "Viewer", value: "viewer" },
];

const STATUS_OPTIONS = [
  { label: "All statuses", value: ALL },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

// Viewers see everything, so they are never assigned.
const ASSIGNMENT_OPTIONS = [
  { label: "Any assignment", value: ALL },
  { label: "Assigned", value: "assigned" },
  { label: "Not assigned", value: "unassigned" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "latest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name A–Z", value: "asc" },
  { label: "Name Z–A", value: "desc" },
];

// The users list's search, filters and order.
const UserSearchFilter = () => {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
    userNamesOrder,
    setUserNamesOrder,
  } = useUserManagementContext();

  const officesQuery = trpc.officeQuery.getOfficeOptions.useQuery();
  const officeOptions = ((officesQuery.data ?? []) as OfficeOption[]).map(
    (office) => ({
      value: String(office.id),
      label: office.name,
      hint: [office.city, office.state].filter(Boolean).join(", "),
    }),
  );

  const setFilter = (next: Partial<UserFilters>) =>
    setFilters({ ...filters, ...next });

  const hasActiveFilters =
    searchQuery !== "" ||
    filters.role !== ALL ||
    filters.status !== ALL ||
    filters.officeId !== ALL ||
    filters.assignment !== ALL;

  return (
    <FilterBar>
      <SearchFilter
        label='Search users'
        placeholder='Search users by name, email, or contact...'
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <SelectFilter
        label='Role'
        value={filters.role}
        onChange={(role) => setFilter({ role: role as UserFilters["role"] })}
        options={ROLE_OPTIONS}
      />
      <SelectFilter
        label='Status'
        value={filters.status}
        onChange={(status) =>
          setFilter({ status: status as UserFilters["status"] })
        }
        options={STATUS_OPTIONS}
      />
      <ComboboxFilter
        label='Office'
        allLabel='All offices'
        Icon={Landmark}
        value={filters.officeId}
        onChange={(officeId) => setFilter({ officeId })}
        options={officeOptions}
        isLoading={officesQuery.isLoading}
        searchPlaceholder='Search offices, cities...'
      />
      <SelectFilter
        label='Assignment'
        Icon={UserCheck}
        value={filters.assignment}
        onChange={(assignment) =>
          setFilter({ assignment: assignment as UserFilters["assignment"] })
        }
        options={ASSIGNMENT_OPTIONS}
      />
      <SelectFilter
        label='Sort users'
        Icon={ArrowUpDown}
        value={userNamesOrder}
        onChange={(value) => setUserNamesOrder(value as UserSort)}
        options={SORT_OPTIONS}
        defaultValue={null}
      />
      {hasActiveFilters && <ClearFiltersButton onClick={resetFilters} />}
    </FilterBar>
  );
};

export default UserSearchFilter;
