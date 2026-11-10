"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import { Form } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import { clientSchemas, clientTypes } from "@pkg/schema";
import ClientDetailsFields, {
  EMPTY_CLIENT_DETAILS,
} from "./client-details-fields";
import ContactPersonsField, {
  type DraftContact,
} from "./contact-persons-field";
import { toContactInput } from "./contact-parts";

// Adds a client (dialog=create-client); "Add Branch" on a main client also
// passes parentClientId to preselect it.
const CreateClientDialog = () => {
  const { getParam, deleteParams } = useHandleParams();
  const isOpen = getParam("dialog") === "create-client";
  const parentClientIdParam = getParam("parentClientId");
  const [addedContacts, setAddedContacts] = useState<DraftContact[]>([]);

  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const form = useForm<clientTypes.createClientInput>({
    resolver: zodResolver(clientSchemas.createClientSchema),
    defaultValues: { ...EMPTY_CLIENT_DETAILS, parent_client_id: null },
  });

  // Re-seed on every open, with the main client "Add Branch" came from.
  useEffect(() => {
    if (!isOpen) return;
    setAddedContacts([]);
    form.reset({
      ...EMPTY_CLIENT_DETAILS,
      parent_client_id: parentClientIdParam
        ? Number(parentClientIdParam)
        : null,
    });
  }, [isOpen, parentClientIdParam, form]);

  const handleClose = () => deleteParams(["dialog", "parentClientId"]);

  const addClientWithContacts =
    trpc.clientMutation.createClientWithContacts.useMutation({
      onSuccess: () => {
        toast.success("Client added successfully");
        utils.clientQuery.getClients.invalidate();
        utils.clientQuery.getClientGroups.invalidate();
        utils.clientQuery.getClientOptions.invalidate();
        utils.clientQuery.getAllClientContacts.invalidate();
        utils.clientQuery.totalClientAndContact.invalidate();
        handleClose();
      },
      onError: (error: any) => handleError(error, { showToast: true }),
    });

  function onSubmit(values: clientTypes.createClientInput) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const contacts = addedContacts.map(({ key, ...contact }) =>
      toContactInput(contact),
    );
    addClientWithContacts.mutate({
      client: values,
      contacts: contacts.length > 0 ? contacts : undefined,
    });
  }

  return (
    <DialogWindow
      title='Add Client'
      description='Add a client or a branch of a main client, with its contact persons'
      open={isOpen}
      size='lg'
      setOpen={handleClose}>
      <Form {...form}>
        <CustomForm
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6 py-0 pl-0'>
          <ClientDetailsFields
            nameLabel='Client Name'
            namePlaceholder='e.g. ONGC - Jorhat'
            showParentClient
          />

          <ContactPersonsField
            added={addedContacts}
            onAddedChange={setAddedContacts}
            allowCopy
          />

          <div className='sticky -bottom-1 flex justify-end gap-3 border-t bg-white py-4'>
            <CustomButton
              text='Cancel'
              variant='outline'
              onClick={handleClose}
              type='button'
            />
            <CustomButton
              text='Add Client'
              variant='primary'
              type='submit'
              loading={addClientWithContacts.isPending}
              disableForViewer
            />
          </div>
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default CreateClientDialog;
