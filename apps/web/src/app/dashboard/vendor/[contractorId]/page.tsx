import VendorDetailPage from "@/components/vendor/vendor-detail-page";
import { MultiRoleProtectedRoute } from "@/components/auth";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

type PageProps = {
  params: { contractorId: string } | Promise<{ contractorId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { contractorId } = await Promise.resolve(params);

  return (
    <MultiRoleProtectedRoute
      allowedRoles={[
        ROLES.ADMIN,
        ROLES.OFFICE_OPERATOR,
        ROLES.VIEWER,
      ]}>
      <VendorDetailPage contractorId={Number(contractorId)} />
    </MultiRoleProtectedRoute>
  );
}
