import { PageWrapper } from "@/components/wrapper/page-wrapper";
import React, { Suspense } from "react";
import CreateOfficeButton from "@/components/office-site/create-office-btn";
import OfficeSitePage from "@/components/office-site/office-site-page";
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
        title='Offices & Sites'
        description='Manage your office locations and work sites'
        button={
          <Suspense fallback={null}>
            <CreateOfficeButton />
          </Suspense>
        }>
        <OfficeSitePage />
      </PageWrapper>
    </MultiRoleProtectedRoute>
  );
};

export default page;
