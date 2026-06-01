import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import CreateUserButton from "@/components/user/create-user-button";
import UserPageSkeleton from "@/components/skeleton/user/user-page-skeleton";
import { AdminRoute } from "@/components/auth";

const UserPage = dynamic(() => import("@/components/user/user-page"));

const page = () => {
  return (
    <AdminRoute>
      <PageWrapper
        title='User Management'
        description='Manage users, assign them to offices, and track their work locations'
        button={
          <Suspense fallback={null}>
            <CreateUserButton />
          </Suspense>
        }>
        <Suspense fallback={<UserPageSkeleton />}>
          <UserPage />
        </Suspense>
      </PageWrapper>
    </AdminRoute>
  );
};

export default page;
