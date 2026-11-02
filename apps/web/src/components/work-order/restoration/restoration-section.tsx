"use client";
import React, { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { constants } from "@pkg/utils";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { useIsManager } from "@/contexts/AuthContext";
import CustomButton from "@/components/shared/btn";
import Error from "@/components/shared/error";
import { Skeleton } from "@/components/ui/skeleton";
import ProcessSectionHeader from "../process-section-header";
import RestorationDialog from "./restoration-dialog";
import RestorationCard from "./restoration-card";
import type { RestorationRate } from "./restoration-rates-table";

const { allActivityOptions } = constants;

export type Restoration = NonNullable<
  RouterOutputs["restorationQuery"]["getRestoration"]
>;

interface Props {
  workOrder: any;
  scheduleOfRates: any[];
}

// Restoration is done across the whole work order, so it has no sites: the
// section is one entry that opens the restoration dialog.
const RestorationSection = ({ workOrder, scheduleOfRates }: Props) => {
  const { setParam } = useHandleParams();
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

  // The work order's restoration activities, in schedule of rates order.
  const rates = useMemo<RestorationRate[]>(
    () =>
      allActivityOptions
        .filter((option) => !option.isBioremediation)
        .flatMap((option) => {
          const sor = scheduleOfRates.find(
            (row) => row.activity === option.value,
          );
          return sor ? [{ ...sor, label: option.label }] : [];
        }),
    [scheduleOfRates],
  );

  const estimatedTotal = rates.reduce(
    (sum, rate) => sum + (Number(rate.total_cost) || 0),
    0,
  );

  const renderBody = () => {
    if (restorationQuery.isLoading) {
      return <Skeleton className='h-28 w-full rounded-xl' />;
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
    if (!restoration) {
      return (
        <div className='flex flex-col items-start gap-3 rounded-xl border border-dashed border-gray-300 p-4 sm:flex-row sm:items-center sm:justify-between'>
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
              onClick={() =>
                setUpMutation.mutate({ work_order_id: workOrder.id })
              }
              disableForViewer
            />
          )}
        </div>
      );
    }

    return (
      <>
        <RestorationCard
          workOrder={workOrder}
          restoration={restoration}
          rates={rates}
          estimatedTotal={estimatedTotal}
          onOpen={() => setParam("dialog", "restoration")}
        />

        <RestorationDialog
          workOrder={workOrder}
          restoration={restoration}
          rates={rates}
          estimatedTotal={estimatedTotal}
        />
      </>
    );
  };

  return (
    <section className='rounded-lg border bg-white p-6'>
      <ProcessSectionHeader
        Icon={RotateCcw}
        tone='restoration'
        title='Restoration'
        description='Done across the whole work order, without sites.'
      />
      {renderBody()}
    </section>
  );
};

export default RestorationSection;
