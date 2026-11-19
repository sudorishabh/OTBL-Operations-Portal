import { ClientManagementProvider } from "@/contexts/ClientManagementContext";
import React from "react";
import { MultiRoleProtectedRoute } from "@/components/auth";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <MultiRoleProtectedRoute
      allowedRoles={[
        ROLES.ADMIN,
        ROLES.OFFICE_OPERATOR,
        ROLES.VIEWER,
      ]}>
      <ClientManagementProvider>{children}</ClientManagementProvider>
    </MultiRoleProtectedRoute>
  );
};

export default ClientLayout;
