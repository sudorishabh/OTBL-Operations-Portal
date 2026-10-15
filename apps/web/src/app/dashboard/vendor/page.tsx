import { PageWrapper } from "@/components/wrapper/page-wrapper";
import React, { Suspense } from "react";
import CreateVendorButton from "@/components/vendor/create-vendor-btn";
import VendorPage from "@/components/vendor/vendor-page";
import { MultiRoleProtectedRoute } from "@/components/auth";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

const page = () => {
  return (
    <MultiRoleProtectedRoute
      allowedRoles={[
        ROLES.ADMIN,
        ROLES.MANAGER,
        ROLES.OFFICE_OPERATOR,
        ROLES.VIEWER,
      ]}>
      <PageWrapper
        title='Vendors'
        description='Contractors your offices give restoration work to'
        button={
          <Suspense fallback={null}>
            <CreateVendorButton />
          </Suspense>
        }>
        <Suspense fallback={null}>
          <VendorPage />
        </Suspense>
      </PageWrapper>
    </MultiRoleProtectedRoute>
  );
};

export default page;
