"use client";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import RecordCode from "@/components/shared/record-code";
import {
  LIST_CELL,
  LIST_FRAME,
  LIST_HEAD,
  LIST_HEAD_ROW,
  LIST_ROW,
  LIST_SUBTEXT,
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

const ALL_USERS_PAGE_SIZE = 50;

// Office operators in cyan, like the offices they work at; site operators in
// orange, like their sites.
const ROLE_TONES: Record<string, PillTone> = {
  admin: "red",
  office_operator: "cyan",
  site_operator: "orange",
  viewer: "gray",
};

type UserRow = userTypes.AllUsersQueryType["users"][number];

const RolePill = ({ role }: { role: string }) => (
  <ListPill tone={ROLE_TONES[role] ?? "gray"}>
    {capitalizeEachWord(role.replace(/_/g, " "))}
  </ListPill>
);

// The offices and sites a user works at, by name.
const UserLocations = ({ user }: { user: UserRow }) => {
  const locations = [...user.offices, ...user.sites].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  if (locations.length === 0) {
    return <span className='text-xs text-gray-400'>No offices & sites</span>;
  }
  return (
    <div className='flex flex-wrap gap-1.5'>
      {locations.map((location) => (
        <ListPill
          key={`${location.type}-${location.id}`}
          square
          tone={location.type === "office" ? "cyan" : "orange"}>
          {capitalFirstLetter(location.name) || "Unknown Office"}
        </ListPill>
      ))}
    </div>
  );
};

// The ⋯ menu on a user's row or card.
const UserActions = ({ user }: { user: UserRow }) => {
  const { setParams } = useHandleParams();
  const isViewer = useIsViewer();
  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// A user on a phone: name and role, how to reach them, then where they work.
const UserCard = ({ user }: { user: UserRow }) => (
  <li className='flex items-start gap-2 px-4 py-3'>
    <div className='min-w-0 flex-1 space-y-2'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
        <RecordCode code={user.code} />
        <span className='min-w-0 truncate text-sm font-semibold text-gray-900'>
          {capitalizeEachWord(user.name)}
        </span>
        <RolePill role={user.role} />
      </div>
      <div className='min-w-0 text-xs text-gray-500'>
        <p className='truncate'>{user.email}</p>
        {user.contact_number && (
          <p className='tabular-nums'>{user.contact_number}</p>
        )}
      </div>
      <UserLocations user={user} />
    </div>
    <div className='-mr-2 -mt-1'>
      <UserActions user={user} />
    </div>
  </li>
);

const UserTable = () => {
  const { userNamesOrder, searchQuery, filters } = useUserManagementContext();
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);

  const queryInput = {
    limit: ALL_USERS_PAGE_SIZE,
    searchQuery: debouncedSearch || undefined,
    role: filters.role,
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
      {/* Phones get cards; the table needs a tablet's width. */}
      <ul className='divide-y divide-gray-100 md:hidden'>
        {allUsersList.map((user) => (
          <UserCard
            key={`user-${user.email}`}
            user={user}
          />
        ))}
      </ul>

      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow className={LIST_HEAD_ROW}>
              <TableHead className={LIST_HEAD}>Name</TableHead>
              <TableHead className={LIST_HEAD}>Contact</TableHead>
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
            {allUsersList.map((user) => (
              <TableRow
                key={`user-${user.email}`}
                className={LIST_ROW}>
                <TableCell className={LIST_CELL}>
                  <p className='flex items-center gap-2 font-medium text-gray-900'>
                    <RecordCode code={user.code} />
                    <span className='truncate'>
                      {capitalizeEachWord(user.name)}
                    </span>
                  </p>
                  <div className='mt-1'>
                    <RolePill role={user.role} />
                  </div>
                </TableCell>
                <TableCell className={LIST_CELL}>
                  {user.email}
                  {user.contact_number && (
                    <p className={cn(LIST_SUBTEXT, "tabular-nums")}>
                      {user.contact_number}
                    </p>
                  )}
                </TableCell>
                <TableCell className={cn(LIST_CELL, "max-w-[450px]")}>
                  <UserLocations user={user} />
                </TableCell>
                <TableCell className={cn(LIST_CELL, "text-right")}>
                  <UserActions user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
};

export default UserTable;
