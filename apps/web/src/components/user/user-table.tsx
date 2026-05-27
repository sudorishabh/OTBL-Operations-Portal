"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  ArrowUp,
  ArrowDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  UserIcon,
} from "lucide-react";
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
import { trpc } from "@/lib/trpc";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
import useHandleParams from "@/hooks/useHandleParams";
import NoFetchData from "@/components/shared/no-fetch-data";
import StatusIndicator from "../shared/status-indicator";
import { userTypes } from "@pkg/schema";
import UserPageSkeleton from "../skeleton/user/user-tab-skeleton";
import { toast } from "react-hot-toast";
import Error from "@/components/shared/error";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const UserTable = () => {
  const { setParams } = useHandleParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [allUsersList, setAllUsersList] = useState<userTypes.AllUserType[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const { userNamesOrder, setUserNamesOrder, searchQuery, filters } =
    useUserManagementContext();

  const allUsersQueryLimit = 50;

  const {
    data: allUsersData,
    isLoading: isAllUserQueryLoading,
    isError,
    error,
    dataUpdatedAt,
  } = trpc.userQuery.getAllUser.useQuery({
    page: currentPage,
    limit: allUsersQueryLimit,
    searchQuery: searchQuery || undefined,
    role: filters.role,
    status: filters.status,
    userNamesOrder,
  });

  const { users, pagination: fetchedPagination } =
    allUsersData ||
    ({
      users: [],
      pagination: {
        page: 1,
        limit: allUsersQueryLimit,
        total: 0,
        totalPages: 1,
        hasMore: false,
      },
    } as userTypes.AllUsersQueryType);

  const isInitialLoading =
    isAllUserQueryLoading &&
    currentPage === 1 &&
    searchQuery === "" &&
    filters.role === "all" &&
    filters.status === "all" &&
    userNamesOrder === "latest";

  const isFetchingMore = isAllUserQueryLoading && currentPage > 1;

  const prevFiltersRef = useRef({
    searchQuery,
    role: filters.role,
    status: filters.status,
  });

  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.searchQuery !== searchQuery ||
      prevFiltersRef.current.role !== filters.role ||
      prevFiltersRef.current.status !== filters.status;

    if (filtersChanged) {
      setCurrentPage(1);
      setAllUsersList([]);
      prevFiltersRef.current = {
        searchQuery,
        role: filters.role,
        status: filters.status,
      };
    }
  }, [searchQuery, filters.role, filters.status]);

  useEffect(() => {
    if (
      !isAllUserQueryLoading &&
      users &&
      fetchedPagination?.page === currentPage
    ) {
      if (currentPage === 1) {
        setAllUsersList(users);
      } else {
        setAllUsersList((prev) => [...prev, ...users]);
      }
      setPagination(fetchedPagination);
    }
  }, [dataUpdatedAt, currentPage]);

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "viewer":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleNameSort = () => {
    if (userNamesOrder === "latest") {
      setUserNamesOrder("oldest");
    } else if (userNamesOrder === "oldest") {
      setUserNamesOrder("asc");
    } else if (userNamesOrder === "asc") {
      setUserNamesOrder("desc");
    } else {
      setUserNamesOrder("latest");
    }
  };

  const getSortIcon = () => {
    if (userNamesOrder === "asc") {
      return <ArrowUp className='h-4 w-4' />;
    } else if (userNamesOrder === "desc") {
      return <ArrowDown className='h-4 w-4' />;
    } else if (userNamesOrder === "latest") {
      return <ArrowDownWideNarrow className='h-4 w-4' />;
    } else {
      return <ArrowUpNarrowWide className='h-4 w-4' />;
    }
  };

  const getSortLabel = () => {
    if (userNamesOrder === "asc") {
      return "A-Z";
    } else if (userNamesOrder === "desc") {
      return "Z-A";
    } else if (userNamesOrder === "latest") {
      return "Latest";
    } else {
      return "Oldest";
    }
  };

  if (isInitialLoading) return <UserPageSkeleton />;

  if (isError && error) {
    return (
      <Error
        variant='default'
        message={error.message}
      />
    );
  }

  const hasUsers = allUsersList.length > 0;

  if (!hasUsers)
    return (
      <NoFetchData
        Icon={UserIcon}
        title='No Users Found'
        description='Add users to manage them'
      />
    );

  return (
    <div className='border rounded-lg bg-white'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-xs'>Status</TableHead>
            <TableHead className='text-xs'>
              <button
                onClick={handleNameSort}
                aria-label={`Sort by name: ${getSortLabel()}`}
                className='flex items-center gap-2 hover:text-foreground transition-colors font-medium'>
                Name
                {getSortIcon()}
                <span className='text-xs font-normal text-muted-foreground'>
                  ({getSortLabel()})
                </span>
              </button>
            </TableHead>
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
                  className={`${user.role === "manager" ? "bg-cyan-800" : ""}`}>
                  {capitalFirstLetter(user.role)}
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
                      <span className='sr-only'>Open menu</span>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
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
                  onClick={handleLoadMore}
                  loading={isFetchingMore}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className='flex justify-between items-center px-4 py-2 text-xs text-muted-foreground border-t'>
        <span>
          Showing {allUsersList.length} of{" "}
          {pagination?.total || allUsersList.length} users
        </span>
        {pagination && pagination.totalPages > 1 && (
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
        )}
      </div>
    </div>
  );
};

export default UserTable;
