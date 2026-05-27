"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DialogWindow from "@/components/shared/dialog-window";
import { Form } from "@/components/ui/form";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Users,
  UserPlus,
  Mail,
  X,
  Phone,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useSearchParams } from "next/navigation";
import { clientSchemas } from "@pkg/schema";
import { z } from "zod";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import toast from "react-hot-toast";

const updateClientFormSchema = clientSchemas.createClientSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});
type UpdateClientFormInput = z.infer<typeof updateClientFormSchema>;

const contactSchema = clientSchemas.createClientContactSchema.omit({
  client_id: true,
});
type ContactFormInput = z.infer<typeof contactSchema>;

type NewContact = {
  id: string;
  name: string;
  designation?: string | null;
  contact_number: string;
  email: string;
  contact_type?: string | null;
};

interface Props {
  clientId: string;
}

const UpdateClientDialog = ({ clientId }: Props) => {
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("dialog") === "update-client";

  const [newContacts, setNewContacts] = useState<NewContact[]>([]);
  const [contactsToRemove, setContactsToRemove] = useState<number[]>([]);
  const [isAddingNewContact, setIsAddingNewContact] = useState(false);

  const { deleteParam } = useHandleParams();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const { data: clientData, isLoading } = trpc.clientQuery.getClient.useQuery(
    { clientId: Number(clientId) },
    { enabled: isOpen && !!clientId },
  );

  const updateClientMutation =
    trpc.clientMutation.updateClientWithContacts.useMutation({
      onSuccess: () => {
        toast.success("Client updated successfully");
        utils.clientQuery.getClient.invalidate({ clientId: Number(clientId) });
        utils.clientQuery.getClients.invalidate();
        handleCloseDialog();
      },
      onError: (error: any) => {
        handleError(error, { showToast: true });
      },
    });

  const form = useForm<UpdateClientFormInput>({
    resolver: zodResolver(updateClientFormSchema),
    defaultValues: {
      name: "",
      address: "",
      state: "",
      city: "",
      pincode: "",
      gst_number: "",
      contact_number: "",
      email: "",
      status: "active",
    },
  });

  const contactForm = useForm<ContactFormInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      designation: "",
      contact_number: "",
      email: "",
      contact_type: "",
    },
  });

  useEffect(() => {
    if (clientData?.client && isOpen) {
      form.reset({
        name: clientData.client.name,
        address: clientData.client.address,
        state: clientData.client.state,
        city: clientData.client.city,
        pincode: clientData.client.pincode,
        gst_number: clientData.client.gst_number,
        contact_number: clientData.client.contact_number,
        email: clientData.client.email,
        status: clientData.client.status,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientData?.client, isOpen]);

  const handleCloseDialog = () => {
    deleteParam("dialog");
    form.reset();
    contactForm.reset();
    setNewContacts([]);
    setContactsToRemove([]);
    setIsAddingNewContact(false);
  };

  const handleAddContact = (values: ContactFormInput) => {
    const contact: NewContact = {
      id: `temp-${Date.now()}`,
      ...values,
    };
    setNewContacts((prev) => [...prev, contact]);
    contactForm.reset();
    setIsAddingNewContact(false);
  };

  const toggleRemoveExisting = (contactId: number) => {
    setContactsToRemove((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId],
    );
  };

  const handleRemoveNew = (tempId: string) => {
    setNewContacts((prev) => prev.filter((c) => c.id !== tempId));
  };

  async function onSubmit(values: UpdateClientFormInput) {
    try {
      const contactsToAdd = newContacts.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ id: _id, designation, contact_type, ...contact }) => ({
          ...contact,
          designation: designation || undefined,
          contact_type: contact_type || undefined,
        }),
      );

      await updateClientMutation.mutateAsync({
        clientId: Number(clientId),
        client: values,
        contactsToAdd: contactsToAdd.length > 0 ? contactsToAdd : undefined,
        contactsToRemove:
          contactsToRemove.length > 0 ? contactsToRemove : undefined,
      });
    } catch {
      // errors handled by onError
    }
  }

  const existingContacts = clientData?.clientUsers ?? [];

  return (
    <DialogWindow
      title='Edit Client'
      description='Update client information and manage contacts'
      open={isOpen}
      size='lg'
      setOpen={handleCloseDialog}>
      {isLoading ? (
        <div className='flex items-center justify-center py-16'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600' />
        </div>
      ) : (
        <Form {...form}>
          <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
            <div className='space-y-6 max-h-[60vh] overflow-y-auto pr-2'>
              {/* Client Information */}
              <div>
                <div className='border-b pb-2 mb-4'>
                  <h3 className='text-base font-semibold text-gray-800'>
                    Client Information
                  </h3>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='col-span-2'>
                    <Input
                      control={form.control}
                      fieldName='name'
                      Label='Client Name'
                      placeholder='Enter client name'
                    />
                  </div>

                  <Input
                    control={form.control}
                    fieldName='email'
                    Label='Email'
                    placeholder='client@example.com'
                    inputIcon={Mail}
                  />

                  <Input
                    control={form.control}
                    fieldName='contact_number'
                    Label='Contact Number'
                    placeholder='+91 1234567890'
                    inputIcon={Phone}
                  />

                  <div className='col-span-2'>
                    <Input
                      control={form.control}
                      fieldName='gst_number'
                      Label='GST Number'
                      placeholder='22AAAAA0000A1Z5'
                    />
                  </div>

                  <div className='col-span-2'>
                    <Input
                      control={form.control}
                      fieldName='address'
                      Label='Address'
                      placeholder='Enter address'
                    />
                  </div>

                  <Input
                    control={form.control}
                    fieldName='city'
                    Label='City'
                    placeholder='Enter city'
                  />

                  <Input
                    control={form.control}
                    fieldName='state'
                    Label='State'
                    placeholder='Enter state'
                  />

                  <Input
                    control={form.control}
                    fieldName='pincode'
                    Label='Pincode'
                    placeholder='110001'
                  />

                  <Input
                    control={form.control}
                    fieldName='status'
                    Label='Status'
                    isSelect
                    selectOptions={[
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inactive" },
                    ]}
                  />
                </div>
              </div>

              {/* Contact Management */}
              <div className='border-t pt-6'>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-2'>
                    <Users className='h-5 w-5 text-[#035864]' />
                    <h3 className='text-lg font-semibold text-gray-900'>
                      Contact Persons
                    </h3>
                    <Badge
                      variant='secondary'
                      className='ml-2'>
                      {existingContacts.length -
                        contactsToRemove.length +
                        newContacts.length}
                    </Badge>
                  </div>
                  {!isAddingNewContact && (
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => setIsAddingNewContact(true)}
                      className='bg-[#035864] hover:bg-[#035864]/90'>
                      <UserPlus className='h-4 w-4 mr-1' />
                      Add Contact
                    </Button>
                  )}
                </div>

                {/* New Contact Form */}
                {isAddingNewContact && (
                  <Form {...contactForm}>
                    <div className='bg-gray-100 p-4 rounded-lg mb-4 space-y-3'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                        <Input
                          control={contactForm.control}
                          fieldName='name'
                          Label='Name'
                          placeholder='Contact name'
                        />

                        <Input
                          control={contactForm.control}
                          fieldName='designation'
                          Label='Designation'
                          placeholder='Manager, CEO, etc.'
                          inputIcon={Briefcase}
                        />

                        <Input
                          control={contactForm.control}
                          fieldName='email'
                          Label='Email'
                          placeholder='contact@example.com'
                          inputIcon={Mail}
                        />

                        <Input
                          control={contactForm.control}
                          fieldName='contact_number'
                          Label='Phone'
                          placeholder='+91 1234567890'
                          inputIcon={Phone}
                        />

                        <div className='col-span-2'>
                          <Input
                            control={contactForm.control}
                            fieldName='contact_type'
                            Label='Contact Type'
                            placeholder='Primary, Finance, Technical, etc.'
                          />
                        </div>
                      </div>
                      <div className='flex gap-2 justify-end'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setIsAddingNewContact(false);
                            contactForm.reset();
                          }}>
                          Cancel
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          onClick={contactForm.handleSubmit(handleAddContact)}
                          className='bg-[#035864] hover:bg-[#035864]/90'>
                          <Plus className='h-4 w-4 mr-1' />
                          Add Contact
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}

                {/* Existing contacts */}
                {existingContacts.length > 0 && (
                  <div className='space-y-2 mb-4'>
                    <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Existing Contacts
                    </p>
                    <div className='space-y-2'>
                      {existingContacts.map((contact: any) => {
                        const isMarkedForRemoval = contactsToRemove.includes(
                          contact.id,
                        );
                        return (
                          <div
                            key={contact.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                              isMarkedForRemoval
                                ? "border-red-200 bg-red-50 opacity-60"
                                : "border-gray-200 bg-white"
                            }`}>
                            <div className='flex items-center gap-3'>
                              <div className='h-9 w-9 rounded-full bg-[#035864]/10 text-[#035864] flex items-center justify-center text-xs font-bold'>
                                {contact.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className='text-sm font-medium text-gray-900'>
                                  {contact.name}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  {contact.email}
                                </p>
                              </div>
                              {contact.contact_type && (
                                <Badge
                                  variant='outline'
                                  className='text-xs'>
                                  {contact.contact_type}
                                </Badge>
                              )}
                            </div>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                toggleRemoveExisting(contact.id as number)
                              }
                              className={
                                isMarkedForRemoval
                                  ? "text-gray-500 hover:text-gray-700"
                                  : "text-red-400 hover:text-red-600 hover:bg-red-50"
                              }>
                              {isMarkedForRemoval ? (
                                <span className='text-xs'>Undo</span>
                              ) : (
                                <Trash2 className='h-4 w-4' />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* New contacts to be added */}
                {newContacts.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      New Contacts to Add
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {newContacts.map((contact: any) => (
                        <div
                          key={contact.id}
                          className='inline-flex items-center gap-2 bg-white border border-[#035864]/20 shadow-xs rounded-full pl-1.5 pr-3 py-1 text-sm text-gray-700'>
                          <div className='h-6 w-6 rounded-full bg-[#035864] text-white flex items-center justify-center text-[10px] font-bold'>
                            {contact.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className='font-medium text-gray-900 text-xs'>
                            {contact.name}
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              handleRemoveNew(contact.id as string)
                            }
                            className='ml-1 text-gray-400 hover:text-red-500 transition-colors'>
                            <X className='h-3.5 w-3.5' />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className='flex justify-end gap-3 pt-4 border-t'>
                <CustomButton
                  text='Cancel'
                  variant='outline'
                  onClick={handleCloseDialog}
                  type='button'
                />
                <CustomButton
                  text='Save Changes'
                  variant='primary'
                  type='submit'
                  loading={updateClientMutation.isPending}
                  disableForViewer
                />
              </div>
            </div>
          </CustomForm>
        </Form>
      )}
    </DialogWindow>
  );
};

export default UpdateClientDialog;
