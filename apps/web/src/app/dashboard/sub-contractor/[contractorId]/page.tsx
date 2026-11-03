import { PageWrapper } from "@/components/wrapper/page-wrapper";
import ContractorDetail from "@/components/vendor/contractor-detail";
import { CONTRACTOR_LABELS } from "@/components/vendor/contractor-labels";
import { MultiRoleProtectedRoute } from "@/components/auth";
import { constants } from "@pkg/utils";

const { ROLES, CONTRACTOR_TYPE } = constants;

type PageProps = {
  params: { contractorId: string } | Promise<{ contractorId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { contractorId } = await Promise.resolve(params);
  const type = CONTRACTOR_TYPE.SUB_CONTRACTOR;

  return (
    <MultiRoleProtectedRoute
      allowedRoles={[
        ROLES.ADMIN,
        ROLES.MANAGER,
        ROLES.OFFICE_OPERATOR,
        ROLES.VIEWER,
      ]}>
      <PageWrapper
        title={CONTRACTOR_LABELS[type].one}
        description={`Every order and job order this ${CONTRACTOR_LABELS[type].one.toLowerCase()} is on`}>
        <ContractorDetail
          contractorId={Number(contractorId)}
          type={type}
        />
      </PageWrapper>
    </MultiRoleProtectedRoute>
  );
}
