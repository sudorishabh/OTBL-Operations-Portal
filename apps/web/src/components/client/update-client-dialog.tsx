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
} from "@/components/clients/client-details-fields";
import ContactPersonsField, {
  type DraftContact,
} from "@/components/clients/contact-persons-field";
import { toContactInput } from "@/components/clients/contact-parts";

interface Props {
  clientId: string;
}

// Edits a client's details and contact persons (dialog=update-client).
const UpdateClientDialog = ({ clientId }: Props) => {
  const { getParam, deleteParam } = useHandleParams();
  const isOpen = getParam("dialog") === "update-client";

  const [addedContacts, setAddedContacts] = useState<DraftContact[]>([]);
  const [removedContactIds, setRemovedContactIds] = useState<number[]>([]);

  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const { data: clientData, isLoading } = trpc.clientQuery.getClient.useQuery(
    { clientId: Number(clientId) },
    { enabled: isOpen && !!clientId },
  );
  const client = clientData?.client;

  const form = useForm<clientTypes.createClientInput>({
    resolver: zodResolver(clientSchemas.createClientSchema),
    defaultValues: { ...EMPTY_CLIENT_DETAILS, parent_client_id: null },
  });

  // Re-seed on every open so a cancelled edit doesn't linger.
  useEffect(() => {
    if (!isOpen || !client) return;
    setAddedContacts([]);
    setRemovedContactIds([]);
    form.reset({
      parent_client_id: client.parent_client_id ?? null,
      name: client.name,
      address: client.address,
      state: client.state,
      city: client.city,
      pincode: client.pincode,
      gst_number: client.gst_number,
      contact_number: client.contact_number ?? "",
      email: client.email ?? "",
      status: client.status,
    });
  }, [client, isOpen, form]);

  const handleClose = () => deleteParam("dialog");

  const updateClient = trpc.clientMutation.updateClientWithContacts.useMutation(
    {
      onSuccess: () => {
        toast.success("Client updated successfully");
        utils.clientQuery.getClient.invalidate({ clientId: Number(clientId) });
        utils.clientQuery.getClients.invalidate();
        utils.clientQuery.getClientGroups.invalidate();
        utils.clientQuery.getClientOptions.invalidate();
        utils.clientQuery.getClientContacts.invalidate();
        utils.clientQuery.getAllClientContacts.invalidate();
        utils.clientQuery.totalClientAndContact.invalidate();
        handleClose();
      },
      onError: (error: any) => handleError(error, { showToast: true }),
    },
  );

  function onSubmit(values: clientTypes.createClientInput) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const contacts = addedContacts.map(({ key, ...contact }) =>
      toContactInput(contact),
    );
    updateClient.mutate({
      clientId: Number(clientId),
      client: values,
      contactsToAdd: contacts.length > 0 ? contacts : undefined,
      contactsToRemove:
        removedContactIds.length > 0 ? removedContactIds : undefined,
    });
  }

  return (
    <DialogWindow
      title='Edit Client'
      description='Update the client details and contact persons'
      open={isOpen}
      size='lg'
      setOpen={handleClose}
      isLoading={isLoading}>
      <Form {...form}>
        <CustomForm
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6 py-0 pl-0'>
          <ClientDetailsFields
            nameLabel='Client Name'
            namePlaceholder='e.g. ONGC - Jorhat'
            showParentClient
            showStatus
          />

          <ContactPersonsField
            added={addedContacts}
            onAddedChange={setAddedContacts}
            saved={clientData?.clientUsers ?? []}
            removedIds={removedContactIds}
            onRemovedIdsChange={setRemovedContactIds}
          />

          <div className='sticky -bottom-1 flex justify-end gap-3 border-t bg-white py-4'>
            <CustomButton
              text='Cancel'
              variant='outline'
              onClick={handleClose}
              type='button'
            />
            <CustomButton
              text='Save Changes'
              variant='primary'
              type='submit'
              loading={updateClient.isPending}
              disableForViewer
            />
          </div>
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default UpdateClientDialog;
