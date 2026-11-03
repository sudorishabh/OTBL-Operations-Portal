import { PageWrapper } from "@/components/wrapper/page-wrapper";
import React, { Suspense } from "react";
import CreateVendorButton from "@/components/vendor/create-vendor-btn";
import VendorPage from "@/components/vendor/vendor-page";
import { CONTRACTOR_LABELS } from "@/components/vendor/contractor-labels";
import { MultiRoleProtectedRoute } from "@/components/auth";
import { constants } from "@pkg/utils";

const { ROLES, CONTRACTOR_TYPE } = constants;

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
        description={CONTRACTOR_LABELS[CONTRACTOR_TYPE.VENDOR].description}
        button={
          <Suspense fallback={null}>
            <CreateVendorButton type={CONTRACTOR_TYPE.VENDOR} />
          </Suspense>
        }>
        <Suspense fallback={null}>
          <VendorPage type={CONTRACTOR_TYPE.VENDOR} />
        </Suspense>
      </PageWrapper>
    </MultiRoleProtectedRoute>
  );
};

export default page;
