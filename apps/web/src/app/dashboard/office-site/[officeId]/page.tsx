import { Suspense } from "react";
import OfficePage from "@/components/office-site/office/office-page";
import OfficePageSkeleton from "@/components/skeleton/office-site/office-page-skeleton";
import { MultiRoleProtectedRoute } from "@/components/auth";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

type PageProps = {
  params: { officeId: string } | Promise<{ officeId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { officeId } = await Promise.resolve(params);

  return (
    <MultiRoleProtectedRoute
      allowedRoles={[
        ROLES.ADMIN,
        ROLES.OFFICE_OPERATOR,
        ROLES.VIEWER,
      ]}>
      <Suspense fallback={<OfficePageSkeleton />}>
        <OfficePage officeId={Number(officeId)} />
      </Suspense>
    </MultiRoleProtectedRoute>
  );
}
