import React from "react";
import { MultiRoleProtectedRoute } from "@/components/auth";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

const WorkOrderLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <MultiRoleProtectedRoute
      allowedRoles={[
        ROLES.ADMIN,
        ROLES.MANAGER,
        ROLES.OFFICE_OPERATOR,
        ROLES.VIEWER,
      ]}>
      {children}
    </MultiRoleProtectedRoute>
  );
};

export default WorkOrderLayout;
