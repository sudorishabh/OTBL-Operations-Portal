"use client";
import React from "react";
import { ArrowUpDown, Landmark, UserCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import {
  defaultUserFilters,
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

// The users list's search, filters and order. In a role's dialog on the
// categorized tab, the role is fixed.
const UserSearchFilter = () => {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    userNamesOrder,
    setUserNamesOrder,
  } = useUserManagementContext();
  const { getParam } = useHandleParams();

  const isAllUsers = !getParam("tab") || getParam("tab") === "all";
  const isCategoryDialog = getParam("dialog") === "categorized";
  const isShown = isAllUsers || isCategoryDialog;

  const officesQuery = trpc.officeQuery.getOfficeOptions.useQuery(undefined, {
    enabled: isShown,
  });
  const officeOptions = ((officesQuery.data ?? []) as OfficeOption[]).map(
    (office) => ({
      value: String(office.id),
      label: office.name,
      hint: [office.city, office.state].filter(Boolean).join(", "),
    }),
  );

  if (!isShown) return null;

  const setFilter = (next: Partial<UserFilters>) =>
    setFilters({ ...filters, ...next });

  const hasActiveFilters =
    searchQuery !== "" ||
    (!isCategoryDialog && filters.role !== ALL) ||
    filters.status !== ALL ||
    filters.officeId !== ALL ||
    filters.assignment !== ALL;

  // A role's dialog keeps its role when cleared.
  const clearFilters = () => {
    setSearchQuery("");
    setFilters({
      ...defaultUserFilters,
      role: isCategoryDialog ? filters.role : ALL,
    });
  };

  return (
    <FilterBar>
      <SearchFilter
        label='Search users'
        placeholder='Search users by name, email, or contact...'
        value={searchQuery}
        onChange={setSearchQuery}
      />
      {!isCategoryDialog && (
        <SelectFilter
          label='Role'
          value={filters.role}
          onChange={(role) => setFilter({ role: role as UserFilters["role"] })}
          options={ROLE_OPTIONS}
        />
      )}
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
      {hasActiveFilters && <ClearFiltersButton onClick={clearFilters} />}
    </FilterBar>
  );
};

export default UserSearchFilter;
