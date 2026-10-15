"use client";
import React, { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DialogWindow from "@/components/shared/dialog-window";
import { Form } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import CustomForm from "@/components/shared/form";
import toast from "react-hot-toast";
import { useHandleParams } from "@/hooks/useHandleParams";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { useApiError } from "@/hooks/useApiError";
import { useParams } from "next/navigation";
import { workOrderSchemas } from "@pkg/schema";
import { toStoredDocument } from "@/lib/documents";
import Step1BasicDetails from "./step1-basic-details";
import Step2ScheduleOfRates from "./step2-schedule-of-rates";
import StepperCreateWO from "./stepper-create-wo";
import { z } from "zod";

// Documents are picked as files and uploaded on submit, so the form omits them.
const workOrderFormSchema = workOrderSchemas.baseWorkOrderSchema.omit({
  documents: true,
});
type WorkOrderFormInput = z.input<typeof workOrderFormSchema>;
type WorkOrderFormValues = z.output<typeof workOrderFormSchema>;

interface Props {
  proposalTitle: string;
}

const CreateWODialog = ({ proposalTitle }: Props) => {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState("");
  const params = useParams();
  const clientId = params?.clientId ? Number(params.clientId) : 0;
  const { deleteParams, getParam } = useHandleParams();
  const { handleError } = useApiError();
  const dialogQuery = getParam("dialog");
  const proposalId = getParam("proposal-id");
  const isOpenDialog = dialogQuery === "create-workorder" && proposalId;

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: "/WorkOrders",
    // The folder is shared by all work orders; never overwrite another's file.
    conflictBehavior: "rename",
  });

  const form = useForm<WorkOrderFormInput, unknown, WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      code: "",
      agreement_number: "",
      rate_contract_number: "",
      title: "",
      start_date: undefined,
      end_date: undefined,
      handing_over_date: undefined,
      process_type: undefined,
      description: "",
      schedule_of_rates: [],
    },
  });

  const { handleSubmit } = form;

  const utils = trpc.useUtils();

  const createWorkOrder = trpc.workOrderMutation.createWorkOrder.useMutation({
    onSuccess: () => {
      utils.proposalQuery.getProposalsByClient.invalidate({
        client_id: clientId,
      });
      toast.success("Work order created successfully!");
    },
    onError: (error: any) => {
      console.error("Error creating work order:", error.flatten().fieldErrors);
      handleError(error.flatten().fieldErrors, { showToast: true });
    },
  });

  const handleCloseDialog = useCallback(() => {
    if (isUploading) {
      toast.error("Please wait for the document to finish uploading.");
      return;
    }
    deleteParams(["dialog", "proposal-id"]);

    setTimeout(() => {
      form.reset({
        code: "",
        agreement_number: "",
        rate_contract_number: "",
        title: "",
        start_date: undefined,
        end_date: undefined,
        handing_over_date: undefined,
        process_type: undefined,
        description: "",
        job_number: "",
        joint_estimate_number: "",
        area: "",
        installation_type: "",
        land_owner_name: "",
        remarks: "",
        schedule_of_rates: [],
      });
      setStep(1);
      setFiles([]);
      setFilesError("");
      resetUpload();
    }, 500);
  }, [deleteParams, form, isUploading, resetUpload]);

  const handleFilesChange = (nextFiles: File[]) => {
    setFiles(nextFiles);
    if (nextFiles.length > 0) setFilesError("");
  };

  const handleNextStep = async () => {
    const isValid = await form.trigger([
      "code",
      "agreement_number",
      "rate_contract_number",
      "title",
      "start_date",
      "end_date",
      "handing_over_date",
      "process_type",
      "job_number",
      "joint_estimate_number",
      "area",
      "installation_type",
      "land_owner_name",
      "remarks",
    ]);
    if (files.length === 0) {
      setFilesError("Upload at least one document");
    }
    if (isValid && files.length > 0) {
      setStep(2);
    } else {
      toast.error("Please fill in all required fields before proceeding.");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const uploaded = await uploadFiles(files);
      if (!uploaded) return;

      await createWorkOrder.mutateAsync({
        ...values,
        proposal_id: Number(proposalId),
        client_id: clientId,
        documents: uploaded.map(toStoredDocument),
      });
      handleCloseDialog();
    } catch (error) {
      toast.error("Error submitting form. Please try again.");
    }
  });

  const steps = [
    {
      number: 1,
      title: "Basic Details",
      isActive: step === 1,
      isCompleted: step > 1,
    },
    {
      number: 2,
      title: "Schedule of Rates",
      isActive: step === 2,
      isCompleted: false,
    },
  ];

  return (
    <DialogWindow
      title='Create Work Order'
      description={`Create a new work order for proposal: ${proposalTitle}`}
      heightMode='full'
      open={isOpenDialog as boolean}
      size='2xl'
      setOpen={handleCloseDialog}>
      <Form {...form}>
        <CustomForm
          onSubmit={onSubmit}
          className='h-full flex flex-col'>
          <StepperCreateWO steps={steps} />
          {step === 1 && (
            <Step1BasicDetails
              files={files}
              onFilesChange={handleFilesChange}
              filesError={filesError}
              isUploading={isUploading}
              progress={progress}
              onNext={handleNextStep}
              onCancel={handleCloseDialog}
            />
          )}
          {step === 2 && (
            <Step2ScheduleOfRates
              onBack={() => setStep(1)}
              isLoading={
                form.formState.isSubmitting ||
                createWorkOrder.isPending ||
                isUploading
              }
            />
          )}
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default CreateWODialog;
