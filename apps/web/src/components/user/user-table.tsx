"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, UserCheck, UserIcon, UserX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserManagementContext } from "@/contexts/UserManagementContext";
import { useIsViewer } from "@/contexts/AuthContext";
import type { UseQueryResult } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
import useHandleParams from "@/hooks/useHandleParams";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import { useDebounce } from "@/hooks/useDebounce";
import NoFetchData from "@/components/shared/no-fetch-data";
import PaginationSummary from "@/components/shared/pagination-summary";
import StatusIndicator from "../shared/status-indicator";
import RecordCode from "@/components/shared/record-code";
import {
  LIST_CELL,
  LIST_FRAME,
  LIST_HEAD,
  LIST_HEAD_ROW,
  LIST_ROW,
  ListLoadMore,
  ListPill,
  RowActionsButton,
  type PillTone,
} from "@/components/shared/list-table";
import { cn } from "@/lib/utils";
import { userTypes } from "@pkg/schema";
import UserTabSkeleton from "../skeleton/user/user-tab-skeleton";
import { toast } from "react-hot-toast";
import Error from "@/components/shared/error";
import UserStatusDialog, { type StatusTarget } from "./user-status-dialog";

const ALL_USERS_PAGE_SIZE = 50;

// Office roles in cyan and sky, like the offices they work at; site
// operators in orange, like their sites.
const ROLE_TONES: Record<string, PillTone> = {
  admin: "red",
  office_manager: "cyan",
  office_operator: "sky",
  site_operator: "orange",
  viewer: "gray",
};

const UserTable = () => {
  const { setParams } = useHandleParams();
  const isViewer = useIsViewer();
  // The user whose account is being turned off or on.
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);

  const { userNamesOrder, searchQuery, filters } = useUserManagementContext();
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);

  const queryInput = {
    limit: ALL_USERS_PAGE_SIZE,
    searchQuery: debouncedSearch || undefined,
    role: filters.role,
    status: filters.status,
    officeId: filters.officeId === "all" ? undefined : Number(filters.officeId),
    assignment: filters.assignment === "all" ? undefined : filters.assignment,
    userNamesOrder,
  };

  const { pages, loadMore } = useLoadMorePages(queryInput);

  const pageQueries: UseQueryResult<userTypes.AllUsersQueryType>[] =
    trpc.useQueries((t: any) =>
      pages.map((page) => t.userQuery.getAllUser({ ...queryInput, page })),
    );

  const allUsersList = pageQueries.flatMap((query) => query.data?.users ?? []);
  const pagination = pageQueries
    .flatMap((query) => query.data?.pagination ?? [])
    .at(-1);
  const failedQuery = pageQueries.find((query) => query.isError);

  const isFiltered =
    !!debouncedSearch ||
    filters.role !== "all" ||
    filters.status !== "all" ||
    filters.officeId !== "all" ||
    filters.assignment !== "all";

  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;

  if (pageQueries[0]?.isLoading) return <UserTabSkeleton />;

  if (failedQuery?.error) {
    return (
      <Error
        variant='default'
        message={failedQuery.error.message}
      />
    );
  }

  const hasUsers = allUsersList.length > 0;

  if (!hasUsers)
    return (
      <NoFetchData
        Icon={UserIcon}
        title={isFiltered ? "No matching users" : "No Users Found"}
        description={
          isFiltered
            ? "Try another search or clear the filters."
            : "Add users to manage them"
        }
      />
    );

  return (
    <div className={LIST_FRAME}>
      <Table>
        <TableHeader>
          <TableRow className={LIST_HEAD_ROW}>
            <TableHead className={LIST_HEAD}>Status</TableHead>
            <TableHead className={LIST_HEAD}>Name</TableHead>
            <TableHead className={LIST_HEAD}>Email</TableHead>
            <TableHead className={LIST_HEAD}>Contact</TableHead>
            <TableHead className={LIST_HEAD}>Role</TableHead>
            <TableHead className={LIST_HEAD}>
              <span className='flex items-center gap-1.5'>
                <ListPill
                  square
                  tone='cyan'>
                  Offices
                </ListPill>
                /
                <ListPill
                  square
                  tone='orange'>
                  Sites
                </ListPill>
              </span>
            </TableHead>
            <TableHead className={cn(LIST_HEAD, "w-12")}>
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allUsersList.map((user) => {
            const locations = [...user.offices, ...user.sites].sort((a, b) =>
              a.name.localeCompare(b.name),
            );

            return (
              <TableRow
                key={`user-${user.email}`}
                className={LIST_ROW}>
                <TableCell className={LIST_CELL}>
                  <StatusIndicator
                    status={user.status as "active" | "inactive"}
                  />
                </TableCell>
                <TableCell className={LIST_CELL}>
                  <p className='flex items-center gap-2 font-medium text-gray-900'>
                    <RecordCode code={user.code} />
                    <span className='truncate'>
                      {capitalizeEachWord(user.name)}
                    </span>
                  </p>
                </TableCell>
                <TableCell className={LIST_CELL}>{user.email}</TableCell>
                <TableCell className={cn(LIST_CELL, "tabular-nums")}>
                  {user.contact_number || "—"}
                </TableCell>
                <TableCell className={LIST_CELL}>
                  <ListPill tone={ROLE_TONES[user.role] ?? "gray"}>
                    {capitalizeEachWord(user.role.replace(/_/g, " "))}
                  </ListPill>
                </TableCell>
                <TableCell className={cn(LIST_CELL, "max-w-[450px]")}>
                  {locations.length > 0 ? (
                    <div className='flex flex-wrap gap-1.5'>
                      {locations.map((location) => (
                        <ListPill
                          key={`${location.type}-${location.id}`}
                          square
                          tone={location.type === "office" ? "cyan" : "orange"}>
                          {capitalFirstLetter(location.name) ||
                            "Unknown Office"}
                        </ListPill>
                      ))}
                    </div>
                  ) : (
                    <span className='text-xs text-gray-400'>
                      No offices & sites
                    </span>
                  )}
                </TableCell>
                <TableCell className={cn(LIST_CELL, "text-right")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <RowActionsButton label={`Actions for ${user.name}`} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        disabled={isViewer}
                        onClick={() => {
                          setParams({
                            "dialog-over": "update-user",
                            id: user.id.toString(),
                          });
                        }}>
                        <Edit className='mr-2 h-4 w-4' />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.status === "active" ? (
                        <DropdownMenuItem
                          variant='destructive'
                          disabled={isViewer}
                          onClick={() => setStatusTarget(user)}>
                          <UserX className='mr-2 h-4 w-4' />
                          Deactivate User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          disabled={isViewer}
                          onClick={() => setStatusTarget(user)}>
                          <UserCheck className='mr-2 h-4 w-4' />
                          Reactivate User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {pagination?.hasMore && (
        <ListLoadMore
          onClick={loadMore}
          loading={isFetchingMore}
        />
      )}
      <PaginationSummary
        shown={allUsersList.length}
        total={pagination?.total}
        page={pagination?.page}
        totalPages={pagination?.totalPages}
        noun='users'
        className='border-t'
      />

      <UserStatusDialog
        user={statusTarget}
        onClose={() => setStatusTarget(null)}
      />
    </div>
  );
};

export default UserTable;
