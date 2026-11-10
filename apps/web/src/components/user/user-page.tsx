"use client";
import React from "react";
import UserSearchNFilter from "./User-search-filter";
import ScrollToTop from "@/components/scroll-to-top";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import UserTabSkeleton from "../skeleton/user/user-tab-skeleton";

const UserTable = dynamic(() => import("./user-table"), {
  loading: () => <UserTabSkeleton />,
});
const CreateUpdateUserDialog = dynamic(
  () => import("./create-update-user-dialog"),
);

const UserPage = () => {
  return (
    <>
      <div className='w-full mt-8'>
        <div className='mb-4'>
          <UserSearchNFilter />
        </div>

        <Suspense fallback={<UserTabSkeleton />}>
          <UserTable />
        </Suspense>
      </div>
      <CreateUpdateUserDialog />
      <ScrollToTop />
    </>
  );
};

export default UserPage;
