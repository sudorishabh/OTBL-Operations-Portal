import CustomButton from "@/components/shared/btn";
import Input from "@/components/shared/input";
import { useUserManagementContext } from "@/contexts/UserManagementContext";
import { useDebounce } from "@/hooks/useDebounce";
import useHandleParams from "@/hooks/useHandleParams";
import { Search, X } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

const UserSearchFilter = () => {
  const { searchQuery, setSearchQuery, filters, setFilters, resetFilters } =
    useUserManagementContext();
  const { getParam } = useHandleParams();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);
  const prevSearchQueryRef = useRef(searchQuery);

  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  if (
    searchQuery === "" &&
    prevSearchQueryRef.current !== "" &&
    localSearchQuery !== ""
  ) {
    setLocalSearchQuery("");
  }
  prevSearchQueryRef.current = searchQuery;

  const hasActiveFilters =
    searchQuery !== "" || filters.role !== "all" || filters.status !== "all";

  const isAllUsers = !getParam("tab") || getParam("tab") === "all";

  const isCategoryDialog = getParam("dialog") === "categorized";

  return (
    <>
      {isAllUsers || isCategoryDialog ? (
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
          <div className='w-full sm:w-80'>
            <Input
              mode='standalone'
              isWhiteBg={true}
              value={localSearchQuery}
              onChange={setLocalSearchQuery}
              placeholder='Search users by name, email, or contact...'
              inputIcon={Search}
            />
          </div>

          <div className='flex flex-wrap items-center gap-2 sm:gap-3 text-xs'>
            {!isCategoryDialog && (
              <Input
                mode='standalone'
                value={filters.role}
                onChange={(value) =>
                  setFilters({
                    ...filters,
                    role: value as
                      | "all"
                      | "manager"
                      | "office_operator"
                      | "site_operator"
                      | "viewer",
                  })
                }
                isWhiteBg={true}
                isSelect
                selectOptions={[
                  { label: "All Roles", value: "all" },
                  { label: "Manager", value: "manager" },
                  { label: "Office Operator", value: "office_operator" },
                  { label: "Site Operator", value: "site_operator" },
                  { label: "Viewer", value: "viewer" },
                ]}
                className='h-8! w-[140px] text-xs cursor-pointer'
              />
            )}

            <Input
              mode='standalone'
              value={filters.status}
              onChange={(value) =>
                setFilters({
                  ...filters,
                  status: value as "all" | "active" | "inactive",
                })
              }
              isWhiteBg={true}
              isSelect
              selectOptions={[
                { label: "All Status", value: "all" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
              className='h-8! w-[140px] text-xs cursor-pointer'
            />

            {hasActiveFilters && !isCategoryDialog && (
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
      ) : (
        <div></div>
      )}
    </>
  );
};

export default UserSearchFilter;
