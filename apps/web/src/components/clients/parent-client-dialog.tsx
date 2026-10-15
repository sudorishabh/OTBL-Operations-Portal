"use client";
import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Network } from "lucide-react";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import Input from "@/components/shared/input";
import { Form } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import { clientSchemas, clientTypes } from "@pkg/schema";

type ParentClientOption = Pick<clientTypes.parentClientType, "id" | "name">;

// Adds (dialog=create-parent-client) or renames
// (dialog=edit-parent-client&parentClientId=…) a main client.
const ParentClientDialog = () => {
  const { getParam, deleteParams } = useHandleParams();
  const dialog = getParam("dialog");
  const isEdit = dialog === "edit-parent-client";
  const isOpen = isEdit || dialog === "create-parent-client";
  const parentClientId = Number(getParam("parentClientId"));
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const form = useForm<clientTypes.createParentClientInput>({
    resolver: zodResolver(clientSchemas.createParentClientSchema),
    defaultValues: { name: "" },
  });

  const { data: parentClients, isLoading } =
    trpc.clientQuery.getParentClients.useQuery(undefined, {
      enabled: isEdit,
    });
  const parentClient = (parentClients as ParentClientOption[] | undefined)?.find(
    (parent) => parent.id === parentClientId,
  );

  // Re-seed on every open so a cancelled edit doesn't linger.
  useEffect(() => {
    if (!isOpen) return;
    form.reset({ name: isEdit ? (parentClient?.name ?? "") : "" });
  }, [isOpen, isEdit, parentClient, form]);

  const handleClose = useCallback(() => {
    deleteParams(["dialog", "parentClientId"]);
  }, [deleteParams]);

  const handleSaved = (message: string) => {
    toast.success(message);
    utils.clientQuery.getParentClients.invalidate();
    utils.clientQuery.getClients.invalidate();
    handleClose();
  };

  const createParentClient =
    trpc.clientMutation.createParentClient.useMutation({
      onSuccess: () => handleSaved("Main client added successfully"),
      onError: (error: any) => handleError(error, { showToast: true }),
    });

  const updateParentClient =
    trpc.clientMutation.updateParentClient.useMutation({
      onSuccess: () => handleSaved("Main client renamed successfully"),
      onError: (error: any) => handleError(error, { showToast: true }),
    });

  function onSubmit(values: clientTypes.createParentClientInput) {
    if (isEdit) {
      updateParentClient.mutate({ id: parentClientId, ...values });
    } else {
      createParentClient.mutate(values);
    }
  }

  return (
    <DialogWindow
      open={isOpen}
      setOpen={handleClose}
      isLoading={isEdit && isLoading}
      title={isEdit ? "Rename Main Client" : "Add Main Client"}
      description='A main client groups its branches, e.g. ONGC for ONGC - Delhi and ONGC - Ahmedabad'
      size='sm'
      heightMode='auto'>
      {isEdit && !parentClient ? (
        <p className='py-10 text-center text-sm text-muted-foreground'>
          This main client could not be found.
        </p>
      ) : (
        <Form {...form}>
          <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
            <Input
              control={form.control}
              fieldName='name'
              Label='Main Client Name'
              LabelIcon={Network}
              placeholder='e.g. ONGC'
            />

            <div className='flex justify-end gap-4 pt-4 border-t'>
              <CustomButton
                type='button'
                text='Cancel'
                variant='secondary'
                onClick={handleClose}
              />
              <CustomButton
                type='submit'
                text={isEdit ? "Save Changes" : "Add Main Client"}
                variant='primary'
                loading={
                  createParentClient.isPending || updateParentClient.isPending
                }
                disableForViewer
              />
            </div>
          </CustomForm>
        </Form>
      )}
    </DialogWindow>
  );
};

export default ParentClientDialog;
