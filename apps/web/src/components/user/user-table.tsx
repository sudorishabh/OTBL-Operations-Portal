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
import { Badge } from "@/components/ui/badge";
import { Edit, UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
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
import { userTypes } from "@pkg/schema";
import UserTabSkeleton from "../skeleton/user/user-tab-skeleton";
import { toast } from "react-hot-toast";
import Error from "@/components/shared/error";

const ALL_USERS_PAGE_SIZE = 50;

const UserTable = () => {
  const { setParams } = useHandleParams();
  const isViewer = useIsViewer();

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "office_manager":
        return "default";
      case "viewer":
        return "secondary";
      default:
        return "outline";
    }
  };

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
    <div className='border rounded-lg bg-white'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-xs'>Status</TableHead>
            <TableHead className='text-xs'>Name</TableHead>
            <TableHead className='text-xs'>Email</TableHead>
            <TableHead className='text-xs'>Contact</TableHead>
            <TableHead className='text-xs'>Role</TableHead>
            <TableHead className='text-xs flex gap-1.5 items-center'>
              <span className='text-xs font-medium bg-cyan-800/15 px-1.5 text-cyan-900 py-0.5 rounded-sm'>
                Offices
              </span>
              <span>/</span>
              <span className='text-xs font-medium bg-orange-800/15 px-1.5 text-orange-900 py-0.5 rounded-sm'>
                Sites
              </span>
            </TableHead>
            <TableHead className='text-xs text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allUsersList.map((user) => (
            <TableRow key={`user-${user.email}`}>
              <TableCell className='pl-6'>
                <StatusIndicator
                  status={user.status as "active" | "inactive"}
                />
              </TableCell>
              <TableCell className='text-xs font-medium'>
                {capitalizeEachWord(user.name)}
              </TableCell>
              <TableCell className='text-xs'>{user.email}</TableCell>
              <TableCell className='text-xs'>
                {user.contact_number || "- - - - - - -"}
              </TableCell>
              <TableCell className='text-xs'>
                <Badge
                  variant={getRoleBadgeVariant(user.role)}
                  className={`${user.role === "office_manager" ? "bg-cyan-800" : ""}`}>
                  {capitalizeEachWord(user.role.replace(/_/g, " "))}
                </Badge>
              </TableCell>
              <TableCell className='text-xs overflow-hidden max-w-[450px] flex flex-wrap gap-1.5'>
                {(() => {
                  const sortedLocations = [...user.offices, ...user.sites].sort(
                    (a, b) => a.name.localeCompare(b.name),
                  );

                  return sortedLocations.length > 0 ? (
                    <>
                      {sortedLocations.map((uo) => (
                        <Badge
                          key={`${uo.type}-${uo.id}`}
                          variant='outline'
                          className={`text-xs px-1.5 ${uo.type === "office" ? "bg-cyan-800/15 text-cyan-900" : "bg-orange-800/15 text-orange-900"}`}>
                          {capitalFirstLetter(uo.name) || "Unknown Office"}
                        </Badge>
                      ))}
                    </>
                  ) : (
                    <span className='text-xs text-muted-foreground'>
                      No offices & sites
                    </span>
                  );
                })()}
              </TableCell>
              <TableCell className='text-right'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      className='h-8 w-8 p-0'>
                      <span className='sr-only'>Actions for {user.name}</span>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
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
              </TableCell>
            </TableRow>
          ))}

          {pagination?.hasMore && (
            <TableRow>
              <TableCell
                colSpan={8}
                className='text-center'>
                <LoadMoreBtn
                  onClick={loadMore}
                  loading={isFetchingMore}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
