"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useIsManager } from "@/contexts/AuthContext";
import CustomButton from "@/components/shared/btn";
import Error from "@/components/shared/error";
import { Skeleton } from "@/components/ui/skeleton";
import ProcessSectionHeader from "../process-section-header";
import RestorationCard from "./restoration-card";
import useRestorationRates from "./use-restoration-rates";

export type Restoration = NonNullable<
  RouterOutputs["restorationQuery"]["getRestoration"]
>;

interface Props {
  workOrder: any;
  scheduleOfRates: any[];
}

// Restoration is done across the whole work order, so it has no sites: the
// section is one entry that opens the restoration page.
const RestorationSection = ({ workOrder, scheduleOfRates }: Props) => {
  const pathname = usePathname();
  const isManager = useIsManager();
  const utils = trpc.useUtils();

  const restorationQuery = trpc.restorationQuery.getRestoration.useQuery({
    work_order_id: workOrder.id,
  });
  const restoration = restorationQuery.data;

  const setUpMutation = trpc.restorationMutation.setUpRestoration.useMutation({
    onSuccess: () => {
      toast.success("Restoration set up");
      utils.restorationQuery.getRestoration.invalidate({
        work_order_id: workOrder.id,
      });
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const { rates, estimatedTotal } = useRestorationRates(scheduleOfRates);

  // Set up, the restoration is one panel that opens its page, which sits
  // under whichever work order page this is.
  if (restoration) {
    return (
      <RestorationCard
        workOrder={workOrder}
        restoration={restoration}
        rates={rates}
        estimatedTotal={estimatedTotal}
        href={`${pathname}/restoration`}
      />
    );
  }

  const renderState = () => {
    if (restorationQuery.isLoading) {
      return <Skeleton className='h-20 w-full rounded-lg' />;
    }

    if (restorationQuery.isError) {
      return (
        <Error
          variant='inline'
          message={
            restorationQuery.error.message || "Failed to load restoration"
          }
        />
      );
    }

    // Work orders created before restoration was set up automatically.
    return (
      <div className='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-sm text-gray-600'>
          Restoration isn&apos;t set up for this work order yet.{" "}
          {isManager
            ? "Set it up to manage its operators, expenses and completion."
            : "The office manager can set it up."}
        </p>
        {isManager && (
          <CustomButton
            variant='primary'
            Icon={RotateCcw}
            text='Set up restoration'
            loading={setUpMutation.isPending}
            onClick={() => setUpMutation.mutate({ work_order_id: workOrder.id })}
            disableForViewer
          />
        )}
      </div>
    );
  };

  return (
    <section className='rounded-lg border bg-white p-6'>
      <ProcessSectionHeader
        Icon={RotateCcw}
        tone='restoration'
        title='Restoration'
        description='Across the whole work order'
      />
      {renderState()}
    </section>
  );
};

export default RestorationSection;
