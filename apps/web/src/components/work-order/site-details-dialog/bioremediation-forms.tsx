"use client";
import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Save } from "lucide-react";
import { Form } from "@/components/ui/form";
import CustomInput from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import toast from "react-hot-toast";

const activityDataSchema = z.object({
  estimated_quantity: z.string().min(1, "Required"),
  amount: z.string().optional(),
  transportation_km: z.string().optional(),
});

const bioSampleSchema = z.object({
  tph_document_url: z.string().min(1, "URL Required"),
  tph_value: z.string().min(1, "Required"),
  estimated_quantity: z.string().min(1, "Required"),
});

const oilZappingSchema = z.object({
  document_url: z.string().min(1, "URL Required"),
  estimated_quantity: z.string().min(1, "Required"),
});

const contaminatedSoilFormSchema = z.object({
  data: activityDataSchema,
});

const bioSamplesFormSchema = z.object({
  data: z.array(bioSampleSchema),
});

const oilZappingFormSchema = z.object({
  data: z.array(oilZappingSchema),
});

interface BaseFormProps {
  workOrderSiteId: number;
  phase: "estimate_sub-wo" | "completion";
  initialData: any;
  onSuccess: () => void;
}

interface BioFormProps {
  workOrderSiteId: number;
  initialData: any;
  onSuccess: () => void;
}

export const ContaminatedSoilForm = ({
  workOrderSiteId,
  phase,
  initialData,
  onSuccess,
}: BaseFormProps) => {
  const utils = trpc.useUtils();
  const mutation = trpc.workOrderSiteMutation.saveContaminatedSoil.useMutation({
    onSuccess: () => {
      toast.success("Contaminated Soil saved");
      utils.workOrderSiteQuery.getBioremediationData.invalidate();
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const form = useForm({
    resolver: zodResolver(contaminatedSoilFormSchema as any),
    defaultValues: {
      data: initialData || {
        estimated_quantity: "",
        amount: "",
        transportation_km: "",
      },
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ data: initialData });
    }
  }, [initialData, form]);

  const onSubmit = (values: any) => {
    mutation.mutate({
      work_order_site_id: workOrderSiteId,
      phase: phase as "estimate_sub-wo" | "completion",
      data: values.data,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-4'>
        <div className='bg-gray-50/50 p-4 rounded-lg border border-gray-100'>
          <div className='grid grid-cols-3 gap-4'>
            <CustomInput
              control={form.control as any}
              fieldName='data.estimated_quantity'
              Label='Estimated Qty'
              placeholder='0.00'
              type='number'
            />
            <CustomInput
              control={form.control as any}
              fieldName='data.amount'
              Label='Amount'
              placeholder='0.00'
              type='number'
            />
            <CustomInput
              control={form.control as any}
              fieldName='data.transportation_km'
              Label='Transportation KM'
              placeholder='0.00'
              type='number'
            />
          </div>
        </div>
        <div className='flex justify-end'>
          <CustomButton
            type='submit'
            variant='primary'
            Icon={Save}
            text={mutation.isPending ? "Saving..." : "Save"}
            loading={mutation.isPending}
            disableForViewer
          />
        </div>
      </form>
    </Form>
  );
};

export const BioSamplesForm = ({
  workOrderSiteId,
  initialData,
  onSuccess,
}: BioFormProps) => {
  const utils = trpc.useUtils();
  const mutation = trpc.workOrderSiteMutation.saveBioSamples.useMutation({
    onSuccess: () => {
      toast.success("Bio Samples saved");
      utils.workOrderSiteQuery.getBioremediationData.invalidate();
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const form = useForm({
    resolver: zodResolver(bioSamplesFormSchema as any),
    defaultValues: {
      data: initialData && initialData.length > 0 ? initialData : [],
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ data: initialData });
    }
  }, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "data",
  });

  const onSubmit = (values: any) => {
    mutation.mutate({
      work_order_site_id: workOrderSiteId,
      data: values.data,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-4'>
        <div className='bg-gray-50/50 p-4 rounded-lg border border-gray-100'>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-medium text-gray-700'>Samples List</h4>
            <CustomButton
              type='button'
              variant='outline'
              Icon={Plus}
              text='Add Sample'
              disableForViewer
              onClick={() =>
                append({
                  tph_document_url: "",
                  tph_value: "",
                  estimated_quantity: "",
                })
              }
            />
          </div>
          <div className='space-y-3'>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className='grid grid-cols-12 gap-2 items-start'>
                <div className='col-span-4'>
                  <CustomInput
                    control={form.control as any}
                    fieldName={`data.${index}.tph_document_url`}
                    Label='TPH URL'
                    placeholder='https://...'
                  />
                </div>
                <div className='col-span-3'>
                  <CustomInput
                    control={form.control as any}
                    fieldName={`data.${index}.tph_value`}
                    Label='TPH Value'
                    type='number'
                    placeholder='0.00'
                  />
                </div>
                <div className='col-span-3'>
                  <CustomInput
                    control={form.control as any}
                    fieldName={`data.${index}.estimated_quantity`}
                    Label='Est. Qty'
                    type='number'
                    placeholder='0.00'
                  />
                </div>
                <div className='col-span-2 pt-6 flex justify-end'>
                  <button
                    type='button'
                    onClick={() => remove(index)}
                    className='p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors'>
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <p className='text-sm text-gray-400 italic'>No samples added.</p>
            )}
          </div>
        </div>
        <div className='flex justify-end'>
          <CustomButton
            type='submit'
            variant='primary'
            Icon={Save}
            text={mutation.isPending ? "Saving..." : "Save Samples"}
            loading={mutation.isPending}
            disableForViewer
          />
        </div>
      </form>
    </Form>
  );
};

export const OilZappingForm = ({
  workOrderSiteId,
  initialData,
  onSuccess,
}: BioFormProps) => {
  const utils = trpc.useUtils();
  const mutation = trpc.workOrderSiteMutation.saveOilZapping.useMutation({
    onSuccess: () => {
      toast.success("Oil Zapping saved");
      utils.workOrderSiteQuery.getBioremediationData.invalidate();
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const form = useForm({
    resolver: zodResolver(oilZappingFormSchema as any),
    defaultValues: {
      data: initialData && initialData.length > 0 ? initialData : [],
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ data: initialData });
    }
  }, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "data",
  });

  const onSubmit = (values: any) => {
    mutation.mutate({
      work_order_site_id: workOrderSiteId,
      data: values.data,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-4'>
        <div className='bg-gray-50/50 p-4 rounded-lg border border-gray-100'>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-medium text-gray-700'>
              Oil Zapping Entries
            </h4>
            <CustomButton
              type='button'
              variant='outline'
              Icon={Plus}
              text='Add Entry'
              disableForViewer
              onClick={() =>
                append({
                  document_url: "",
                  estimated_quantity: "",
                })
              }
            />
          </div>
          <div className='space-y-3'>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className='grid grid-cols-12 gap-2 items-start'>
                <div className='col-span-10'>
                  <CustomInput
                    control={form.control as any}
                    fieldName={`data.${index}.document_url`}
                    Label='Document URL'
                    placeholder='https://...'
                  />
                </div>
                <div className='col-span-10'>
                  <CustomInput
                    control={form.control as any}
                    fieldName={`data.${index}.estimated_quantity`}
                    Label='Estimated Qty'
                    type='number'
                    placeholder='0.00'
                  />
                </div>
                <div className='col-span-2 pt-6 flex justify-end'>
                  <button
                    type='button'
                    onClick={() => remove(index)}
                    className='p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors'>
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <p className='text-sm text-gray-400 italic'>No entries added.</p>
            )}
          </div>
        </div>
        <div className='flex justify-end'>
          <CustomButton
            type='submit'
            variant='primary'
            Icon={Save}
            text={mutation.isPending ? "Saving..." : "Save Zapping"}
            loading={mutation.isPending}
            disableForViewer
          />
        </div>
      </form>
    </Form>
  );
};
