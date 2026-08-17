import React from "react";
import { trpc } from "@/lib/trpc";
import { constants } from "@pkg/utils";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import { useUserManagementContext } from "@/contexts/UserManagementContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { capitalizeEachWord } from "@pkg/utils";
import UserTable from "./user-table";
import CustomButton from "@/components/shared/btn";
import UserSearchNFilter from "./User-search-filter";
import StatusIndicator from "../shared/status-indicator";
import UserPageSkeleton from "../skeleton/user/user-tab-skeleton";

const { ROLES } = constants;

const CategorizedUsers = () => {
  const { getParam, setParams, deleteParams } = useHandleParams();
  const { setFilters, resetFilters } = useUserManagementContext();

  const categorizedUsers = trpc.userQuery.getCategories8User.useQuery();

  const {
    managers = [],
    officeOperators = [],
    siteOperators = [],
    viewers = [],
    totalManagers,
    totalOfficeOperators,
    totalSiteOperators,
    totalViewers,
  } = categorizedUsers?.data ?? {};

  if (categorizedUsers.isLoading) {
    return <UserPageSkeleton />;
  }

  const handleOpenCategoryDialog = (
    role:
      | "all"
      | "office_manager"
      | "office_operator"
      | "site_operator"
      | "viewer",
  ) => {
    setFilters({ role, status: "all" });
    setParams({ dialog: "categorized", role });
  };

  const handleCloseDialog = () => {
    deleteParams(["dialog", "role"]);
    setTimeout(() => {
      resetFilters();
    }, 1000);
  };

  const userCategoryData = [
    {
      title: "Office Manager Users",
      users: managers,
      totalUsers: totalManagers,
      onViewAll: () => handleOpenCategoryDialog(ROLES.MANAGER),
    },
    {
      title: "Office Operator Users",
      users: officeOperators,
      totalUsers: totalOfficeOperators,
      onViewAll: () => handleOpenCategoryDialog(ROLES.OFFICE_OPERATOR),
    },
    {
      title: "Site Operator Users",
      users: siteOperators,
      totalUsers: totalSiteOperators,
      onViewAll: () => handleOpenCategoryDialog(ROLES.SITE_OPERATOR),
    },
    {
      title: "Viewer Users",
      users: viewers,
      totalUsers: totalViewers,
      onViewAll: () => handleOpenCategoryDialog(ROLES.VIEWER),
    },
  ];

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
        {userCategoryData.map((category) => (
          <Card
            key={category.title}
            className='flex flex-col h-full py-2.5 gap-0'>
            <CardHeader className='px-2.5 mt-1'>
              <div className='flex items-center justify-between ml-2'>
                <div>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription className='text-xs flex items-center gap-1'>
                    <span>{category.totalUsers}</span>
                    <span>{category.totalUsers === 1 ? "user" : "users"}</span>
                  </CardDescription>
                </div>
                <CustomButton
                  variant='arrow'
                  onClick={category.onViewAll}
                  arrowType='upright'
                />
              </div>
            </CardHeader>
            <CardContent className='flex-1 px-2.5 mt-1'>
              {category.users?.length > 0 ? (
                <div className='space-y-2'>
                  <div className='border rounded-lg bg-white'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='text-xs h-8 pl-7'>
                            Name
                          </TableHead>
                          <TableHead className='text-xs h-8'>Email</TableHead>
                          <TableHead className='text-xs h-8'>Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.users.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className='text-center py-8 text-muted-foreground'>
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          category.users.map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell className='text-xs font-medium py-3 flex items-center gap-2'>
                                <StatusIndicator
                                  status={user.status ? "active" : "inactive"}
                                  size='sm'
                                />
                                {capitalizeEachWord(user.name)}
                              </TableCell>
                              <TableCell className='text-xs py-2'>
                                {user.email}
                              </TableCell>
                              <TableCell className='text-xs py-2'>
                                {user.contact_number || "N/A"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {category.users?.length > 8 && (
                    <p className='text-xs text-muted-foreground text-center pt-2'>
                      and {category.users.length - 8} more
                      {category.users.length - 8 === 1 ? "user" : "users"}...
                    </p>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 text-sm text-muted-foreground'>
                  No {category.title.toLowerCase()} found
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <DialogWindow
        open={getParam("dialog") === "categorized"}
        setOpen={handleCloseDialog}
        title={
          capitalizeEachWord((getParam("role") || "").replace(/_/g, " ")) +
          " Users"
        }
        description={
          getParam("role")
            ? `All users with the ${(getParam("role") || "")
                .replace(/_/g, " ")
                .toLowerCase()} role`
            : ""
        }
        heightMode='full'
        size='full'>
        <div className='max-w-150 mt-1 mb-5'>
          <UserSearchNFilter />
        </div>
        <UserTable />
      </DialogWindow>
    </>
  );
};

export default CategorizedUsers;
