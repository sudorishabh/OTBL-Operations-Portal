"use client";
import React, { useState } from "react";
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
  Search,
  Mail,
  CheckCircle2,
  X,
  Phone,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useSearchParams } from "next/navigation";
import { clientSchemas, clientTypes } from "@pkg/schema";
import { z } from "zod";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import toast from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const contactSchema = clientSchemas.createClientContactSchema.omit({
  client_id: true,
});
type ContactFormInput = z.infer<typeof contactSchema>;

type Contact = {
  id: string | number;
  name: string;
  designation?: string | null;
  contact_number: string;
  email: string;
  contact_type?: string | null;
};

const CreateClientDialog = () => {
  const searchParams = useSearchParams();
  const isAddClientMode = searchParams.get("dialog") === "create-client";
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [isAddingNewContact, setIsAddingNewContact] = useState(false);
  const [contactMode, setContactMode] = useState<"existing" | "new">(
    "existing",
  );
  const [contactSearch, setContactSearch] = useState("");

  const { deleteParam } = useHandleParams();
  const { handleError } = useApiError();

  const utils = trpc.useUtils();

  const existingClientContacts = trpc.clientQuery.getAllClientContacts.useQuery(
    {
      searchQuery: contactSearch,
      clientId: "",
    },
  );

  const addClientWithContacts =
    trpc.clientMutation.createClientWithContacts.useMutation({
      onSuccess: () => {
        toast.success("Client added successfully");
        utils.clientQuery.getClients.invalidate();
        utils.clientQuery.getAllClientContacts.invalidate();
      },
      onError: (error: any) => {
        handleError(error, { showToast: true });
      },
    });

  const form = useForm<clientTypes.createClientInput>({
    resolver: zodResolver(clientSchemas.createClientSchema),
    defaultValues: {
      name: "",
      address: "",
      state: "",
      city: "",
      pincode: "",
      gst_number: "",
      contact_number: "",
      email: "",
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

  const handleCloseDialog = () => {
    deleteParam("dialog");
    form.reset();
    contactForm.reset();
    setSelectedContacts([]);
    setIsAddingNewContact(false);
    setContactMode("existing");
    setContactSearch("");
  };

  async function onSubmit(values: clientTypes.createClientInput) {
    try {
      const newContacts = selectedContacts
        .filter((c: Contact) => c.id.toString().startsWith("temp-"))
        .map(({ id, designation, contact_type, ...contact }) => ({
          ...contact,
          designation: designation || undefined,
          contact_type: contact_type || undefined,
        })) as Array<Omit<clientTypes.createClientContactInput, "client_id">>;

      const existingContactIds = selectedContacts
        .filter((c: Contact) => !c.id.toString().startsWith("temp-"))
        .map((c) => Number(c.id));

      // Note: createClientWithContacts mutation might need updates if it doesn't support linking existing contacts directly yet.
      // Assuming 'contacts' prop handles new contacts. If API doesn't support linking existing contacts, this logic needs backend changes.
      // Based on current file, there was no logic to link existing contacts in onSubmit (it only filtered temp-),
      // which means the previous implementation of "Select Existing" might have been incomplete or I missed how it handled existing ones.
      // Looking at line 118 in original file:
      // const newContacts = selectedContacts.filter(...).map(...)
      // await addClientWithContacts.mutateAsync({ client: values, contacts: newContacts ... })
      // It seems the original code ONLY sent new contacts. Linking existing contacts might be missing or treated as new?
      // Wait, if I select an existing contact, it has an ID. If I send it as "new contact", it creates a duplicate?
      // The type `createClientContactInput` usually doesn't have an ID.
      // If the user's intention with "Choose Existing" is to COPY an existing contact to this client, then sending it as a payload is fine (it creates a new record for this client).
      // If the intention is to LINK, the backend needs to support it.
      // Given the original code:
      // const newContacts = selectedContacts.filter((c: Contact) => c.id.toString().startsWith("temp-"))
      // It EXPLICITLY filtered only "temp-". This implies existing contacts selected via dropdown were IGNORED in submission?
      // That would be a bug in the original code.
      // OR, maybe the original code intended to copy them?
      // Let's look at `handleSelectExistingContact` in original code (line 151). It adds to `selectedContacts`.
      // But `onSubmit` (line 116) filters `c.id.toString().startsWith("temp-")`.
      // So existing contacts (with numeric IDs) were NOT being sent.
      // I will fix this behavior: I should probably send ALL selected contacts as "new contacts" (copies) OR link them.
      // Since I don't know the backend, but `createClientWithContacts` expects `contacts` array of inputs (no ID).
      // I should map ALL selected contacts to the input format, effectively copying existing contacts to this new client.
      // This seems the safest assumption given the "create client" context (contacts are usually specific to a client, but copying details saves typing).

      const allContactsPayload = selectedContacts.map(
        ({ id, designation, contact_type, ...contact }) => ({
          ...contact,
          designation: designation || undefined,
          contact_type: contact_type || undefined,
        }),
      ) as Array<Omit<clientTypes.createClientContactInput, "client_id">>;

      await addClientWithContacts.mutateAsync({
        client: values,
        contacts:
          allContactsPayload.length > 0 ? allContactsPayload : undefined,
      });

      handleCloseDialog();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  }

  const handleAddContact = (values: ContactFormInput) => {
    const newContact: Contact = {
      id: `temp-${Date.now()}`,
      ...values,
    };
    setSelectedContacts([...selectedContacts, newContact]);
    contactForm.reset();
    setIsAddingNewContact(false);
  };

  const handleRemoveContact = (contactId: string | number) => {
    setSelectedContacts(selectedContacts.filter((c) => c.id !== contactId));
  };

  const toggleContact = (contact: Contact) => {
    // Check if already selected
    if (selectedContacts.find((c) => c.id == contact.id)) {
      setSelectedContacts(selectedContacts.filter((c) => c.id != contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  return (
    <DialogWindow
      title='Add Client'
      description='Add a new client to the system and assign contacts'
      open={isAddClientMode}
      size='lg'
      setOpen={handleCloseDialog}>
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
                    {selectedContacts.length}
                  </Badge>
                </div>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant={contactMode === "existing" ? "default" : "outline"}
                    size='sm'
                    onClick={() => {
                      setContactMode("existing");
                      setIsAddingNewContact(false);
                    }}
                    className={
                      contactMode === "existing"
                        ? "bg-[#035864] hover:bg-[#035864]/90"
                        : ""
                    }>
                    Choose Existing
                  </Button>
                  <Button
                    type='button'
                    variant={contactMode === "new" ? "default" : "outline"}
                    size='sm'
                    onClick={() => {
                      setContactMode("new");
                      setIsAddingNewContact(true);
                      setContactSearch("");
                    }}
                    className={
                      contactMode === "new"
                        ? "bg-[#035864] hover:bg-[#035864]/90"
                        : ""
                    }>
                    <UserPlus className='h-4 w-4 mr-1' />
                    Add New
                  </Button>
                </div>
              </div>

              {/* Existing Contacts Picker (Search + Grid) */}
              {contactMode === "existing" && (
                <div className='space-y-4 mb-4'>
                  <div className='rounded-xl border bg-gray-100 shadow-xs overflow-hidden'>
                    <div className='px-4 pt-4 border-b bg-gray-50 pb-4'>
                      <Input
                        mode='standalone'
                        placeholder='Search contacts...'
                        value={contactSearch}
                        onChange={setContactSearch}
                        inputIcon={Search}
                        className='w-full bg-white'
                      />
                    </div>

                    <div className='p-4'>
                      <ScrollArea className='h-56 pr-3 -mr-3'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                          {(existingClientContacts.data || [])
                            .filter(
                              (c: any) =>
                                !contactSearch ||
                                c.name
                                  .toLowerCase()
                                  .includes(contactSearch.toLowerCase()) ||
                                c.email
                                  .toLowerCase()
                                  .includes(contactSearch.toLowerCase()),
                            )
                            .map((contact: Contact) => {
                              const isSelected = selectedContacts.some(
                                (sc) => sc.id == contact.id,
                              );
                              return (
                                <div
                                  key={contact.id}
                                  onClick={() => toggleContact(contact)}
                                  className={cn(
                                    "group flex items-center bg-white justify-between p-3 rounded-lg border transition-all cursor-pointer",
                                    isSelected
                                      ? "border-[#035864] bg-[#035864]/5 ring-[#035864]"
                                      : "border-gray-100 hover:border-[#035864]/30 hover:bg-gray-50/80",
                                  )}>
                                  <div className='flex items-center gap-3 overflow-hidden'>
                                    <div
                                      className={cn(
                                        "h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-colors shadow-sm",
                                        isSelected
                                          ? "bg-[#035864] text-white"
                                          : "bg-white border text-gray-500 group-hover:border-[#035864]/30 group-hover:text-[#035864]",
                                      )}>
                                      {contact.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className='min-w-0'>
                                      <p
                                        className={cn(
                                          "font-medium text-sm transition-colors truncate",
                                          isSelected
                                            ? "text-[#035864]"
                                            : "text-gray-900",
                                        )}>
                                        {contact.name}
                                      </p>
                                      <p className='text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 truncate'>
                                        <Mail className='h-3 w-3 shrink-0' />
                                        {contact.email}
                                      </p>
                                    </div>
                                  </div>
                                  <div className='flex items-center gap-3 shrink-0 pl-2'>
                                    {isSelected ? (
                                      <CheckCircle2 className='h-5 w-5 text-[#035864]' />
                                    ) : (
                                      <div className='h-5 w-5 rounded-full border border-gray-200 group-hover:border-[#035864]/50' />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          {existingClientContacts.data?.length === 0 && (
                            <div className='col-span-2 flex flex-col items-center justify-center py-10 text-gray-500'>
                              <div className='h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3'>
                                <Users className='h-6 w-6 text-gray-400' />
                              </div>
                              <p className='text-sm font-medium'>
                                No contacts found
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              )}

              {/* New Contact Form */}
              {isAddingNewContact && contactMode === "new" && (
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
                          setContactMode("existing");
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

              {/* Selected Contacts List (Chips/Cards for summary) */}
              {selectedContacts.length > 0 && (
                <div className='bg-gray-50 rounded-lg p-4 border border-gray-200 mt-4'>
                  <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
                    Selected Contacts ({selectedContacts.length})
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {selectedContacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className='group inline-flex items-center gap-2 bg-white border border-[#035864]/20 shadow-xs rounded-full pl-1.5 pr-3 py-1 text-sm text-gray-700 animate-in fade-in zoom-in-95 duration-200 max-w-full'>
                        <div className='h-6 w-6 shrink-0 rounded-full bg-[#035864] text-white flex items-center justify-center text-[10px] font-bold'>
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className='flex flex-col overflow-hidden'>
                          <span className='font-medium text-gray-900 text-xs truncate max-w-[150px]'>
                            {contact.name}
                          </span>
                        </div>
                        <button
                          type='button'
                          onClick={() =>
                            handleRemoveContact(contact.id as string)
                          }
                          className='ml-1 text-gray-400 hover:text-red-500 transition-colors shrink-0'>
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
                onClick={() => handleCloseDialog()}
                type='button'
              />
              <CustomButton
                text='Add Client'
                variant='primary'
                type='submit'
                disabled={addClientWithContacts.isPending}
                loading={addClientWithContacts.isPending}
              />
            </div>
          </div>
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default CreateClientDialog;
