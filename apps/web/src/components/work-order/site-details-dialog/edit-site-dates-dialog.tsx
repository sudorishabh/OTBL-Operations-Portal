"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { workOrderSchemas } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import CustomInput from "@/components/shared/input";
import { Form } from "@/components/ui/form";

const datesSchema = workOrderSchemas.updateWorkOrderSiteDatesSchema;
type DatesInput = z.input<typeof datesSchema>;
type DatesValues = z.output<typeof datesSchema>;

interface Props {
  woSiteId: number;
  date: string;
  endDate: string;
}

// Lets an admin correct the dates a work order site runs over.
const EditSiteDatesDialog = ({ woSiteId, date, endDate }: Props) => {
  const [open, setOpen] = useState(false);
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const form = useForm<DatesInput, unknown, DatesValues>({
    resolver: zodResolver(datesSchema),
  });

  const updateDates =
    trpc.workOrderMutation.updateWorkOrderSiteDates.useMutation({
      onSuccess: async () => {
        toast.success("Site dates updated");
        setOpen(false);
        // The work order's site list shows the dates too.
        await Promise.all([
          utils.workOrderSiteQuery.getWorkOrderSiteDetails.invalidate(),
          utils.workOrderQuery.getWorkOrderDetails.invalidate(),
        ]);
      },
      onError: (error: unknown) => handleError(error, { showToast: true }),
    });

  return (
    <>
      <button
        type='button'
        title='Edit site dates'
        onClick={() => {
          form.reset({
            id: woSiteId,
            date: new Date(date),
            end_date: new Date(endDate),
          });
          setOpen(true);
        }}
        className='inline-flex size-5 cursor-pointer items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700'>
        <Pencil className='size-3' />
      </button>

      <DialogWindow
        title='Edit Site Dates'
        description='Correct when work at this site starts and ends'
        size='sm'
        heightMode='auto'
        open={open}
        setOpen={(next) => {
          if (!next && !updateDates.isPending) setOpen(false);
        }}>
        <Form {...form}>
          <CustomForm
            onSubmit={form.handleSubmit((values) => updateDates.mutate(values))}>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <CustomInput
                control={form.control}
                fieldName='date'
                Label='Start Date'
                isDate
              />
              <CustomInput
                control={form.control}
                fieldName='end_date'
                Label='End Date'
                isDate
              />
            </div>
            <CustomButton
              type='submit'
              text='Save dates'
              variant='primary'
              className='w-full'
              loading={updateDates.isPending}
              disabled={updateDates.isPending}
            />
          </CustomForm>
        </Form>
      </DialogWindow>
    </>
  );
};

export default EditSiteDatesDialog;
