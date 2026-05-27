import React, { useEffect } from "react";
import {
  useForm,
  useFieldArray,
  Control,
  FieldValues,
  Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { Form } from "@/components/ui/form";
import CustomInput from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import toast from "react-hot-toast";

// Schemas mirroring the backend
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

// Bioremediation Form Schema
const bioremediationFormSchema = z.object({
  contaminated_soil: activityDataSchema.optional(),
  bio_samples: z.array(bioSampleSchema).optional(),
  oil_zapping: z.array(oilZappingSchema).optional(),
});

// Restoration Form Schema
const restorationFormSchema = z.object({
  clean_soil_area: activityDataSchema.optional(),
  lifting_oil_slush: activityDataSchema.optional(),
  excav_cont_soil: activityDataSchema.optional(),
  trans_cont_soil: activityDataSchema.optional(),
  refill_excav_soil: activityDataSchema.optional(),
});

interface SitePhaseFormProps {
  workOrderSiteId: number;
  phase: "sub_wo" | "estimate" | "expense";
  processType: string;
  initialData: any;
  onSuccess: () => void;
}

export const SitePhaseForm = ({
  workOrderSiteId,
  phase,
  processType,
  initialData,
  onSuccess,
}: SitePhaseFormProps) => {
  const isBio = processType === "bioremediation";
  const utils = trpc.useUtils();

  const bioMutation =
    trpc.workOrderSiteMutation.saveBioremediationPhase.useMutation({
      onSuccess: () => {
        toast.success("Bioremediation phase data saved");
        utils.workOrderSiteQuery.getBioremediationData.invalidate();
        onSuccess();
      },
      onError: (err: any) => toast.error(err.message),
    });

  const restorationMutation =
    trpc.workOrderSiteMutation.saveRestorationPhase.useMutation({
      onSuccess: () => {
        toast.success("Restoration phase data saved");
        utils.workOrderSiteQuery.getRestorationData.invalidate();
        onSuccess();
      },
      onError: (err: any) => toast.error(err.message),
    });

  // Setup Form
  const form = useForm({
    resolver: zodResolver(
      isBio ? bioremediationFormSchema : restorationFormSchema,
    ),
    defaultValues: initialData || {},
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  // Field Arrays for Bioremediation
  const {
    fields: sampleFields,
    append: appendSample,
    remove: removeSample,
  } = useFieldArray({
    control,
    name: "bio_samples",
  } as any);

  const {
    fields: zappingFields,
    append: appendZapping,
    remove: removeZapping,
  } = useFieldArray({
    control,
    name: "oil_zapping",
  } as any);

  const onSubmit = (data: any) => {
    if (isBio) {
      // @ts-ignore - types might be slightly off until rebuild
      bioMutation.mutate({
        work_order_site_id: workOrderSiteId,
        phase,
        ...data,
      });
    } else {
      // @ts-ignore
      restorationMutation.mutate({
        work_order_site_id: workOrderSiteId,
        phase,
        ...data,
      });
    }
  };

  const isLoading = bioMutation.isPending || restorationMutation.isPending;

  // Reusable Activity Fields Component
  // Using 'control' prop on CustomInput as discovered
  const ActivityFields = ({
    prefix,
    label,
  }: {
    prefix: string;
    label: string;
  }) => (
    <div className='bg-gray-50/50 p-4 rounded-lg border border-gray-100 mb-4'>
      <h4 className='text-sm font-medium text-gray-700 mb-3'>{label}</h4>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <CustomInput
          control={control as any}
          fieldName={`${prefix}.estimated_quantity`}
          Label='Estimated Qty'
          placeholder='0.00'
          type='number'
        />
        <CustomInput
          control={control as any}
          fieldName={`${prefix}.amount`}
          Label='Amount'
          placeholder='0.00'
          type='number'
        />
        <CustomInput
          control={control as any}
          fieldName={`${prefix}.transportation_km`}
          Label='Transportation KM'
          placeholder='0.00'
          type='number'
        />
      </div>
    </div>
  );

  if (isBio) {
    return (
      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className='space-y-6'>
          {/* Contaminated Soil */}
          <ActivityFields
            prefix='contaminated_soil'
            label='Contaminated Soil Data'
          />

          {/* Bio Samples */}
          <div className='bg-gray-50/50 p-4 rounded-lg border border-gray-100'>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='text-sm font-medium text-gray-700'>Bio Samples</h4>
              <CustomButton
                type='button'
                variant='outline'
                Icon={Plus}
                text='Add Sample'
                disableForViewer
                onClick={() =>
                  appendSample({
                    tph_document_url: "",
                    tph_value: "",
                    estimated_quantity: "",
                  })
                }
              />
            </div>
            <div className='space-y-3'>
              {sampleFields.map((field, index) => (
                <div
                  key={field.id}
                  className='grid grid-cols-12 gap-2 items-start'>
                  <div className='col-span-4'>
                    <CustomInput
                      control={control as any}
                      fieldName={`bio_samples.${index}.tph_document_url`}
                      Label='TPH URL'
                      placeholder='https://...'
                    />
                  </div>
                  <div className='col-span-3'>
                    <CustomInput
                      control={control as any}
                      fieldName={`bio_samples.${index}.tph_value`}
                      Label='TPH Value'
                      type='number'
                      placeholder='0.00'
                    />
                  </div>
                  <div className='col-span-3'>
                    <CustomInput
                      control={control as any}
                      fieldName={`bio_samples.${index}.estimated_quantity`}
                      Label='Est. Qty'
                      type='number'
                      placeholder='0.00'
                    />
                  </div>
                  <div className='col-span-2 pt-6 flex justify-end'>
                    <button
                      type='button'
                      onClick={() => removeSample(index)}
                      className='p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors'>
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ))}
              {sampleFields.length === 0 && (
                <p className='text-sm text-gray-400 italic'>
                  No samples added.
                </p>
              )}
            </div>
          </div>

          {/* Oil Zapping */}
          <div className='bg-gray-50/50 p-4 rounded-lg border border-gray-100'>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='text-sm font-medium text-gray-700'>Oil Zapping</h4>
              <CustomButton
                type='button'
                variant='outline'
                Icon={Plus}
                text='Add Zapping'
                disableForViewer
                onClick={() =>
                  appendZapping({
                    document_url: "",
                    estimated_quantity: "",
                  })
                }
              />
            </div>
            <div className='space-y-3'>
              {zappingFields.map((field, index) => (
                <div
                  key={field.id}
                  className='grid grid-cols-12 gap-2 items-start'>
                  <div className='col-span-10'>
                    <CustomInput
                      control={control as any}
                      fieldName={`oil_zapping.${index}.document_url`}
                      Label='Document URL'
                      placeholder='https://...'
                    />
                  </div>
                  <div className='col-span-10'>
                    <CustomInput
                      control={control as any}
                      fieldName={`oil_zapping.${index}.estimated_quantity`}
                      Label='Estimated Qty'
                      type='number'
                      placeholder='0.00'
                    />
                  </div>
                  <div className='col-span-2 pt-6 flex justify-end'>
                    <button
                      type='button'
                      onClick={() => removeZapping(index)}
                      className='p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors'>
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ))}
              {zappingFields.length === 0 && (
                <p className='text-sm text-gray-400 italic'>
                  No oil zapping entries.
                </p>
              )}
            </div>
          </div>

          <div className='flex justify-end pt-4'>
            <CustomButton
              type='submit'
              variant='primary'
              Icon={Save}
              text={isLoading ? "Saving..." : "Save Phase Data"}
              loading={isLoading}
              className='w-full sm:w-auto'
              disableForViewer
            />
          </div>
        </form>
      </Form>
    );
  }

  // Restoration Form
  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className='space-y-6'>
        <ActivityFields
          prefix='clean_soil_area'
          label='Cleaning Up Soil Area'
        />
        <ActivityFields
          prefix='lifting_oil_slush'
          label='Lifting/Recovery of Oil Slush'
        />
        <ActivityFields
          prefix='excav_cont_soil'
          label='Excavation of Contaminated Soil'
        />
        <ActivityFields
          prefix='trans_cont_soil'
          label='Transportation of Contaminated Soil'
        />
        <ActivityFields
          prefix='refill_excav_soil'
          label='Refilling Excavated Contaminated Soil'
        />

        <div className='flex justify-end pt-4'>
          <CustomButton
            type='submit'
            variant='primary'
            Icon={Save}
            text={isLoading ? "Saving..." : "Save Phase Data"}
            loading={isLoading}
            className='w-full sm:w-auto'
            disableForViewer
          />
        </div>
      </form>
    </Form>
  );
};
