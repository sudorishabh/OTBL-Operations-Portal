"use client";
import React, { useCallback, useEffect, useState } from "react";
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

type ParentClientFormInput = clientTypes.createParentClientInput;

// Adds (dialog=create-parent-client) or edits
// (dialog=edit-parent-client&parentClientId=…) a main client: the same
// details a branch has, and its own contact persons.
const ParentClientDialog = () => {
  const { getParam, deleteParams } = useHandleParams();
  const dialog = getParam("dialog");
  const isEdit = dialog === "edit-parent-client";
  const isOpen = isEdit || dialog === "create-parent-client";
  const parentClientId = Number(getParam("parentClientId"));
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const [addedContacts, setAddedContacts] = useState<DraftContact[]>([]);
  const [removedContactIds, setRemovedContactIds] = useState<number[]>([]);

  const form = useForm<ParentClientFormInput>({
    resolver: zodResolver(clientSchemas.createParentClientSchema),
    defaultValues: EMPTY_CLIENT_DETAILS,
  });

  const parentClientQuery = trpc.clientQuery.getParentClient.useQuery(
    { parentClientId },
    { enabled: isOpen && isEdit && parentClientId > 0 },
  );
  const parentClient = parentClientQuery.data?.parentClient;
  const savedContacts = (parentClientQuery.data?.contacts ??
    []) as clientTypes.clientUsersType[];

  // Re-seed on every open so a cancelled edit doesn't linger. Main clients
  // added before they had details open with those fields blank.
  useEffect(() => {
    if (!isOpen) return;
    setAddedContacts([]);
    setRemovedContactIds([]);
    form.reset(
      isEdit && parentClient
        ? {
            name: parentClient.name,
            address: parentClient.address ?? "",
            state: parentClient.state ?? "",
            city: parentClient.city ?? "",
            pincode: parentClient.pincode ?? "",
            gst_number: parentClient.gst_number ?? "",
            contact_number: parentClient.contact_number ?? "",
            email: parentClient.email ?? "",
            status: parentClient.status,
          }
        : EMPTY_CLIENT_DETAILS,
    );
  }, [isOpen, isEdit, parentClient, form]);

  const handleClose = useCallback(() => {
    deleteParams(["dialog", "parentClientId"]);
  }, [deleteParams]);

  const handleSaved = (message: string) => {
    toast.success(message);
    utils.clientQuery.getParentClients.invalidate();
    utils.clientQuery.getParentClient.invalidate();
    utils.clientQuery.getClients.invalidate();
    utils.clientQuery.getClientGroups.invalidate();
    utils.clientQuery.getClientContacts.invalidate();
    utils.clientQuery.getAllClientContacts.invalidate();
    utils.clientQuery.totalClientAndContact.invalidate();
    handleClose();
  };

  const createParentClient =
    trpc.clientMutation.createParentClientWithContacts.useMutation({
      onSuccess: () => handleSaved("Main client added successfully"),
      onError: (error: any) => handleError(error, { showToast: true }),
    });

  const updateParentClient =
    trpc.clientMutation.updateParentClientWithContacts.useMutation({
      onSuccess: () => handleSaved("Main client updated successfully"),
      onError: (error: any) => handleError(error, { showToast: true }),
    });

  function onSubmit(values: ParentClientFormInput) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const contacts = addedContacts.map(({ key, ...contact }) =>
      toContactInput(contact),
    );

    if (isEdit) {
      updateParentClient.mutate({
        parentClientId,
        parentClient: values,
        contactsToAdd: contacts.length > 0 ? contacts : undefined,
        contactsToRemove:
          removedContactIds.length > 0 ? removedContactIds : undefined,
      });
    } else {
      createParentClient.mutate({
        parentClient: values,
        contacts: contacts.length > 0 ? contacts : undefined,
      });
    }
  }

  return (
    <DialogWindow
      open={isOpen}
      setOpen={handleClose}
      isLoading={isEdit && parentClientQuery.isLoading}
      title={isEdit ? "Edit Main Client" : "Add Main Client"}
      description='A main client, e.g. ONGC, groups its branches such as ONGC - Delhi and ONGC - Ahmedabad'
      size='lg'>
      {isEdit && !parentClient ? (
        <p className='py-10 text-center text-sm text-muted-foreground'>
          {parentClientQuery.error?.message ??
            "This main client could not be found."}
        </p>
      ) : (
        <Form {...form}>
          <CustomForm
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6 py-0 pl-0'>
            <ClientDetailsFields
              nameLabel='Main Client Name'
              namePlaceholder='e.g. Oil and Natural Gas Corporation Ltd'
              showStatus={isEdit}
            />

            <ContactPersonsField
              added={addedContacts}
              onAddedChange={setAddedContacts}
              saved={isEdit ? savedContacts : undefined}
              removedIds={removedContactIds}
              onRemovedIdsChange={setRemovedContactIds}
              allowCopy={!isEdit}
            />

            <div className='sticky -bottom-1 flex justify-end gap-3 border-t bg-white py-4'>
              <CustomButton
                type='button'
                text='Cancel'
                variant='outline'
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
