"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserSearchNFilter from "./User-search-filter";
import { useHandleParams } from "@/hooks/useHandleParams";
import ScrollToTop from "@/components/scroll-to-top";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import UserTabSkeleton from "../skeleton/user/user-tab-skeleton";

const UserTable = dynamic(() => import("./user-table"));
const CategorizedUsers = dynamic(() => import("./categorized-users"));
const CreateUpdateUserDialog = dynamic(
  () => import("./create-update-user-dialog"),
);

const UserPage = () => {
  const { getParam, setParam } = useHandleParams();
  const currentTab = getParam("tab") || "all";

  return (
    <>
      <Tabs
        value={currentTab}
        onValueChange={(value) => setParam("tab", value)}
        className='w-full mt-8'>
        <div className='flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between'>
          <UserSearchNFilter />
          <TabsList className='bg-gray-300/60 h-8! self-start sm:self-auto'>
            <TabsTrigger
              value='all'
              className='text-xs cursor-pointer'>
              Show All
            </TabsTrigger>
            <TabsTrigger
              value='categorized'
              className='text-xs cursor-pointer'>
              Categorized
            </TabsTrigger>
          </TabsList>
        </div>

        <Suspense fallback={<UserTabSkeleton />}>
          <TabsContent value='all'>
            <UserTable />
          </TabsContent>

          <TabsContent value='categorized'>
            <CategorizedUsers />
          </TabsContent>
        </Suspense>
      </Tabs>
      <CreateUpdateUserDialog />
      <ScrollToTop />
    </>
  );
};

export default UserPage;
