import { PageWrapper } from "@/components/wrapper/page-wrapper";
import ContractorDetail from "@/components/vendor/contractor-detail";
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
        ROLES.MANAGER,
        ROLES.OFFICE_OPERATOR,
        ROLES.VIEWER,
      ]}>
      <PageWrapper
        title='Vendor'
        description='Every order and job order this vendor is on'>
        <ContractorDetail contractorId={Number(contractorId)} />
      </PageWrapper>
    </MultiRoleProtectedRoute>
  );
}
