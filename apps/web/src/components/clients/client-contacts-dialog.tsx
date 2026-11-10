"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Pencil, Trash2, UserPlus, Users } from "lucide-react";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import Error from "@/components/shared/error";
import { Form } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsAdmin } from "@/contexts/AuthContext";
import { useApiError } from "@/hooks/useApiError";
import { trpc } from "@/lib/trpc";
import { capitalizeEachWord } from "@pkg/utils";
import { clientSchemas, clientTypes } from "@pkg/schema";
import {
  ContactAction,
  ContactFormFields,
  ContactRow,
  EMPTY_CONTACT,
  toContactForm,
  toContactInput,
  type ContactFields,
} from "./contact-parts";

// Whose contacts these are: a client (branch) or a main client.
export type ContactOwner = { clientId: number } | { parentClientId: number };

interface Props {
  open: boolean;
  onClose: () => void;
  owner: ContactOwner;
  ownerName: string;
}

type Contact = clientTypes.clientUsersType;

// A branch's or a main client's contact persons. Admins add, edit and remove
// them here, each saved at once.
const ClientContactsDialog = ({ open, onClose, owner, ownerName }: Props) => {
  const isAdmin = useIsAdmin();
  const utils = trpc.useUtils();
  const { handleError } = useApiError();
  // The open form: a new contact, or the id of the contact being edited.
  const [editing, setEditing] = useState<"new" | number | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const form = useForm<ContactFields>({
    resolver: zodResolver(clientSchemas.clientContactFieldsSchema),
    defaultValues: EMPTY_CONTACT,
  });

  const contactsQuery = trpc.clientQuery.getClientContacts.useQuery(owner, {
    enabled: open,
  });
  const contacts = (contactsQuery.data ?? []) as Contact[];

  const closeForm = () => {
    setEditing(null);
    form.reset(EMPTY_CONTACT);
  };

  const handleSaved = (message: string) => {
    toast.success(message);
    utils.clientQuery.getClientContacts.invalidate();
    utils.clientQuery.getClient.invalidate();
    utils.clientQuery.getParentClient.invalidate();
    utils.clientQuery.getClientGroups.invalidate();
    utils.clientQuery.getAllClientContacts.invalidate();
    utils.clientQuery.totalClientAndContact.invalidate();
  };
  const onError = (error: any) => handleError(error, { showToast: true });

  const createContact = trpc.clientMutation.createClientContact.useMutation({
    onSuccess: () => {
      handleSaved("Contact added");
      closeForm();
    },
    onError,
  });
  const updateContact = trpc.clientMutation.updateClientContact.useMutation({
    onSuccess: () => {
      handleSaved("Contact updated");
      closeForm();
    },
    onError,
  });
  const deleteContact = trpc.clientMutation.deleteClientContact.useMutation({
    onSuccess: () => {
      handleSaved("Contact removed");
      setDeleting(null);
    },
    onError,
  });

  const onSubmit = (values: ContactFields) => {
    const contact = toContactInput(values);
    if (editing === "new") {
      createContact.mutate({
        ...contact,
        ...("clientId" in owner
          ? { client_id: owner.clientId }
          : { parent_client_id: owner.parentClientId }),
      });
    } else if (typeof editing === "number") {
      updateContact.mutate({ ...contact, id: editing });
    }
  };

  const startAdding = () => {
    form.reset(EMPTY_CONTACT);
    setEditing("new");
  };

  const startEditing = (contact: Contact) => {
    form.reset(toContactForm(contact));
    setEditing(contact.id);
  };

  const handleClose = () => {
    closeForm();
    onClose();
  };

  const contactForm = (
    <Form {...form}>
      <CustomForm
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-3 rounded-lg bg-gray-50 p-4 ring-1 ring-inset ring-gray-200'>
        <ContactFormFields isWhiteBg />
        <div className='flex justify-end gap-2'>
          <CustomButton
            type='button'
            text='Cancel'
            variant='outline'
            onClick={closeForm}
          />
          <CustomButton
            type='submit'
            text={editing === "new" ? "Add Contact" : "Save Contact"}
            variant='primary'
            loading={createContact.isPending || updateContact.isPending}
          />
        </div>
      </CustomForm>
    </Form>
  );

  return (
    <>
      <DialogWindow
        open={open}
        setOpen={handleClose}
        title='Contacts'
        description={`Contact persons of ${capitalizeEachWord(ownerName)}`}
        size='md'
        isLoading={contactsQuery.isLoading}
        loadingSkeleton='list'>
        <div className='space-y-3 pb-2'>
          <div className='flex items-center justify-between gap-3'>
            <p className='text-sm text-gray-500'>
              {contacts.length === 1
                ? "1 contact"
                : `${contacts.length} contacts`}
            </p>
            {isAdmin && editing !== "new" && (
              <CustomButton
                text='Add Contact'
                Icon={UserPlus}
                variant='primary'
                onClick={startAdding}
              />
            )}
          </div>

          {editing === "new" && contactForm}

          {contactsQuery.isError ? (
            <Error
              variant='inline'
              message={contactsQuery.error.message}
            />
          ) : contacts.length === 0 ? (
            editing !== "new" && (
              <div className='flex flex-col items-center gap-2 py-10 text-center text-gray-500'>
                <Users className='size-6 text-gray-400' />
                <p className='text-sm'>No contact persons yet.</p>
              </div>
            )
          ) : (
            contacts.map((contact) =>
              editing === contact.id ? (
                <div key={contact.id}>{contactForm}</div>
              ) : (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  actions={
                    isAdmin && (
                      <>
                        <ContactAction
                          label={`Edit ${contact.name}`}
                          icon={Pencil}
                          onClick={() => startEditing(contact)}
                        />
                        <ContactAction
                          label={`Remove ${contact.name}`}
                          icon={Trash2}
                          tone='danger'
                          onClick={() => setDeleting(contact)}
                        />
                      </>
                    )
                  }
                />
              ),
            )
          )}
        </div>
      </DialogWindow>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {deleting && capitalizeEachWord(deleting.name)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They are removed from the contacts of{" "}
              {capitalizeEachWord(ownerName)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleting &&
                deleteContact.mutate({ clientContactId: deleting.id })
              }
              className='bg-red-600 text-white hover:bg-red-700'>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientContactsDialog;
