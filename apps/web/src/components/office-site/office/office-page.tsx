"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import CustomButton from "@/components/shared/btn";
import Error from "@/components/shared/error";
import ScrollToTop from "@/components/scroll-to-top";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import OfficePageSkeleton, {
  OFFICE_PAGE_DESCRIPTION,
} from "@/components/skeleton/office-site/office-page-skeleton";
import OfficeDetailsCard from "./office-details-card";
import OfficeMembers from "./office-members";
import OfficeSites from "./office-sites";
import OfficeWorkOrders from "./office-work-orders";
import type { OfficeDetails } from "./office-types";

const EditOfficeDialog = dynamic(() => import("../edit-office-dialog"));
const CreateSiteDialog = dynamic(() => import("../create-site-dialog"));
const ManageOfficeMembersDialog = dynamic(
  () => import("../manage-office-members-dialog"),
);
const SiteWorkOrdersDialog = dynamic(
  () => import("../site-work-orders-dialog"),
);

const NO_RETRY_CODES = ["FORBIDDEN", "NOT_FOUND", "UNAUTHORIZED"];

// An office's own page: its details, members, sites and work orders.
const OfficePage = ({ officeId }: { officeId: number }) => {
  const router = useRouter();
  const { setParams } = useHandleParams();

  const { data, isLoading, error } = trpc.officeQuery.getOffice.useQuery(
    { officeId },
    {
      enabled: officeId > 0,
      // A missing office, or one the user can't see, won't change on retry.
      retry: (failureCount: number, error: any) =>
        !NO_RETRY_CODES.includes(error?.data?.code) && failureCount < 3,
    },
  );
  const details = data as OfficeDetails | undefined;

  const goBack = () => router.push("/dashboard/office-site");

  if (isLoading) return <OfficePageSkeleton />;

  if (!details) {
    return (
      <PageWrapper
        title='Office'
        description={OFFICE_PAGE_DESCRIPTION}
        backClick={goBack}>
        <div className='mt-4'>
          <Error
            variant='default'
            message={error?.message ?? "This office could not be found."}
          />
        </div>
      </PageWrapper>
    );
  }

  const { office, canManage } = details;

  return (
    <PageWrapper
      title={office.name.toUpperCase()}
      description={OFFICE_PAGE_DESCRIPTION}
      backClick={goBack}
      button={
        canManage && (
          <CustomButton
            text='Edit details'
            variant='primary'
            Icon={PencilLine}
            onClick={() =>
              setParams({ dialog: "edit-office", officeId: String(office.id) })
            }
            disableForViewer
          />
        )
      }>
      <div className='mt-4 space-y-4'>
        <OfficeDetailsCard details={details} />
        <OfficeMembers details={details} />
        <OfficeSites details={details} />
        <OfficeWorkOrders details={details} />
      </div>

      <EditOfficeDialog />
      <ManageOfficeMembersDialog />
      <CreateSiteDialog />
      <SiteWorkOrdersDialog />
      <ScrollToTop />
    </PageWrapper>
  );
};

export default OfficePage;
