"use client";
import React, { useEffect, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DialogWindow from "@/components/shared/dialog-window";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import CustomInput from "@/components/shared/input";
import OfficeSelect from "@/components/shared/office-select";
import CustomButton from "@/components/shared/btn";
import { trpc } from "@/lib/trpc";
import CustomForm from "@/components/shared/form";
import toast from "react-hot-toast";
import { useHandleParams } from "@/hooks/useHandleParams";
import DocumentsField from "@/components/shared/documents-field";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { useApiError } from "@/hooks/useApiError";
import { toStoredDocument } from "@/lib/documents";
import { proposalSchemas } from "@pkg/schema";
import { z } from "zod";

// Documents are picked as files and uploaded on submit, so the form omits them.
const proposalFormSchema = proposalSchemas.baseProposalSchema.omit({
  documents: true,
});
type ProposalFormInput = z.input<typeof proposalFormSchema>;
type ProposalFormValues = z.output<typeof proposalFormSchema>;

const EMPTY_FORM: ProposalFormInput = {
  code: "",
  title: "",
  description: "",
  office_id: undefined as unknown as number,
  proposal_submission_date: undefined as unknown as Date,
};

interface Props {
  clientId: number;
}

const CreateProposalDialog = ({ clientId }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState("");
  const { deleteParams, getParam } = useHandleParams();
  const { handleError } = useApiError();
  const mode = getParam("dialog");
  const isAddMode = mode === "create-proposal";
  const isOpenDialog = isAddMode;

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: "/Proposals",
    // The folder is shared by all proposals; never overwrite another's file.
    conflictBehavior: "rename",
  });

  const { data: officesData, isLoading: isLoadingOffices } =
    trpc.officeQuery.getOffices.useQuery(
      { searchQuery: "", status: "active" },
      { enabled: isOpenDialog },
    );

  const form = useForm<ProposalFormInput, unknown, ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const utils = trpc.useUtils();

  const addProposal = trpc.proposalMutation.createProposal.useMutation({
    onSuccess: () => {
      utils.proposalQuery.getProposalsByClient.invalidate();
      toast.success("Proposal added");
      handleCloseDialog();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  const handleCloseDialog = useCallback(() => {
    if (isUploading) {
      toast.error("Please wait for the document to finish uploading.");
      return;
    }
    deleteParams(["dialog"]);

    setTimeout(() => {
      form.reset(EMPTY_FORM);
      setFiles([]);
      setFilesError("");
      resetUpload();
    }, 500);
  }, [deleteParams, form, isUploading, resetUpload]);

  useEffect(() => {
    if (isAddMode) {
      form.reset(EMPTY_FORM);
      setFiles([]);
      setFilesError("");
      resetUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddMode]);

  const handleFilesChange = (nextFiles: File[]) => {
    setFiles(nextFiles);
    if (nextFiles.length > 0) setFilesError("");
  };

  async function onSubmit(values: ProposalFormValues) {
    if (files.length === 0) {
      setFilesError("Upload at least one document");
      return;
    }

    const uploaded = await uploadFiles(files);
    if (!uploaded) return;

    addProposal.mutate({
      ...values,
      client_id: clientId,
      documents: uploaded.map(toStoredDocument),
    });
  }

  const offices = officesData?.offices ?? [];
  const isSubmitting =
    form.formState.isSubmitting || addProposal.isPending || isUploading;

  return (
    <DialogWindow
      title='Add Proposal'
      description='Add a new proposal'
      open={isOpenDialog}
      size='md'
      setOpen={handleCloseDialog}>
      <Form {...form}>
        <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <CustomInput
              control={form.control}
              fieldName='code'
              Label='Code'
              placeholder='Enter code'
            />

            <FormField
              control={form.control}
              name='office_id'
              render={({ field }) => (
                <FormItem className='space-y-1 min-w-0'>
                  <FormLabel className='text-xs font-medium text-neutral-700'>
                    Office
                  </FormLabel>
                  <FormControl>
                    <OfficeSelect
                      offices={offices}
                      value={field.value}
                      onChange={field.onChange}
                      isLoading={isLoadingOffices}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />
          </div>

          <CustomInput
            control={form.control}
            fieldName='title'
            Label='Title'
            placeholder='Enter title'
          />

          <CustomInput
            control={form.control}
            fieldName='description'
            Label='Description'
            isTextArea={true}
            placeholder='Enter description'
            optional
          />

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <CustomInput
              control={form.control}
              fieldName='proposal_submission_date'
              Label='Submission Date'
              isDate={true}
              placeholder='Select date'
            />
          </div>

          <div>
            <DocumentsField
              label='Proposal Documents'
              files={files}
              onFilesChange={handleFilesChange}
              isUploading={isUploading}
              progress={progress}
            />
            {filesError && (
              <p className='mt-1 text-xs text-destructive'>{filesError}</p>
            )}
          </div>

          <CustomButton
            type='submit'
            text={isUploading ? "Uploading..." : "Submit"}
            className='w-full'
            variant='primary'
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default CreateProposalDialog;
