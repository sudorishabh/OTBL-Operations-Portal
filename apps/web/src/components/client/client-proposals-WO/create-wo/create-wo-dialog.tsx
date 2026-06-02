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
import { workOrderSchemas, type workOrderTypes } from "@pkg/schema";
import Step1BasicDetails from "./step1-basic-details";
import Step2ScheduleOfRates from "./step2-schedule-of-rates";
import StepperCreateWO from "./stepper-create-wo";
import { ZodError } from "zod";

interface Props {
  proposalTitle: string;
}

const CreateWODialog = ({ proposalTitle }: Props) => {
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const params = useParams();
  const clientId = params?.clientId ? Number(params.clientId) : 0;
  const { deleteParams, getParam } = useHandleParams();
  const { handleError } = useApiError();
  const dialogQuery = getParam("dialog");
  const proposalId = getParam("proposal-id");
  const isOpenDialog = dialogQuery === "create-workorder" && proposalId;

  const {
    uploadFile,
    deleteFile,
    isUploading,
    isDeleting,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: "/WorkOrders",
    conflictBehavior: "replace",
  });

  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [uploadedFileId, setUploadedFileId] = useState<string>("");

  const form = useForm<workOrderTypes.BaseWorkOrderInput>({
    resolver: zodResolver(workOrderSchemas.baseWorkOrderSchema),
    defaultValues: {
      code: "",
      agreement_number: "",
      rate_contract_number: "",
      title: "",
      start_date: undefined,
      end_date: undefined,
      handing_over_date: undefined,
      document_key: "",
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
        document_key: "",
        process_type: undefined,
        description: "",
        schedule_of_rates: [],
      });
      setStep(1);
      setSelectedFile(null);
      setUploadedUrl("");
      setUploadedFileId("");
      resetUpload();
    }, 500);
  }, [deleteParams, form, isUploading, resetUpload]);

  const handleFileSelect = useCallback(
    (file: File | null) => {
      setSelectedFile(file);
      if (file) {
        setUploadedUrl("");
        setUploadedFileId("");
        form.setValue("document_key", `pending:${file.name}`, {
          shouldValidate: true,
        });
      } else {
        if (!uploadedUrl) {
          form.setValue("document_key", "", { shouldValidate: true });
        }
      }
    },
    [form, uploadedUrl],
  );

  const handleDeleteFile = useCallback(async () => {
    if (uploadedFileId) {
      try {
        await deleteFile(uploadedFileId);
      } catch (error) {
        console.error("Failed to delete file from SharePoint", error);
      }
    }

    setSelectedFile(null);
    setUploadedUrl("");
    setUploadedFileId("");
    form.setValue("document_key", "", { shouldValidate: true });
    resetUpload();
  }, [form, resetUpload, deleteFile, uploadedFileId]);

  const handleNextStep = async () => {
    const isValid = await form.trigger([
      "code",
      "agreement_number",
      "rate_contract_number",
      "title",
      "start_date",
      "end_date",
      "handing_over_date",
      "document_key",
      "process_type",
    ]);
    if (isValid) {
      setStep(2);
    } else {
      toast.error("Please fill in all required fields before proceeding.");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      let documentPath = values.document_key;

      if (selectedFile && !uploadedUrl && documentPath.startsWith("pending:")) {
        const uploadResult = await uploadFile(selectedFile);
        if (!uploadResult) {
          return;
        }
        documentPath = uploadResult.webUrl;
        setUploadedUrl(documentPath);
        setUploadedFileId(uploadResult.id);
      } else if (uploadedUrl) {
        documentPath = uploadedUrl;
      }

      if (documentPath.startsWith("pending:")) {
        toast.error("Please upload a document");
        return;
      }

      console.log("Submitting work order:", values);
      await createWorkOrder.mutateAsync({
        ...values,
        proposal_id: Number(proposalId),
        client_id: clientId,
        document_key: documentPath,
      });
      handleCloseDialog();
    } catch (error) {
      if (uploadedFileId) {
        await deleteFile(uploadedFileId);
      }
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
              selectedFile={selectedFile}
              handleFileSelect={handleFileSelect}
              isUploading={isUploading}
              progress={progress}
              uploadedFile={!!uploadedUrl}
              documentUrl={uploadedUrl}
              deleteFile={handleDeleteFile}
              isDeleting={isDeleting}
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
