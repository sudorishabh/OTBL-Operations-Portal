"use client";
import React from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import { trpc } from "@/lib/trpc";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiError } from "@/hooks/useApiError";
import toast from "react-hot-toast";
import { clientSchemas, type clientTypes } from "@pkg/schema";
interface Client {
  id: number;
  name: string;
  email: string;
}

const CreateClientContactDialog = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClientAddMode =
    searchParams.get("dialog") === "create-client-contact";
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const {
    data: clients,
    isLoading,
    error,
  } = trpc.clientQuery.getClients.useQuery({
    searchQuery: "",
    status: "all",
  });

  const addClientContact = trpc.clientMutation.createClientContact.useMutation({
    onSuccess: () => {
      toast.success("Contact added successfully");
      utils.clientQuery.getAllClientContacts.invalidate();
      utils.clientQuery.getClients.invalidate();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  const form = useForm<clientTypes.createClientContactInput>({
    resolver: zodResolver(clientSchemas.createClientContactSchema),
    defaultValues: {
      client_id: isClientAddMode ? 0 : 0,
      name: "",
      designation: "",
      contact_number: "",
      email: "",
      contact_type: "",
    },
  });

  // Update client_id when preselectedClientId changes
  // React.useEffect(() => {
  //   if (preselectedClientId) {
  //     form.setValue("client_id", preselectedClientId);
  //   }
  // }, [preselectedClientId, form]);

  async function onSubmit(values: clientTypes.createClientContactInput) {
    try {
      await addClientContact.mutateAsync({
        ...values,
        designation: values.designation,
        contact_type: values.contact_type,
      });
      // setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  }

  const handleCloseDialog = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("dialog");
    router.push(`?${params.toString()}`);
    form.reset({
      client_id: 0,
      name: "",
      designation: "",
      contact_number: "",
      email: "",
      contact_type: "",
    });
  };

  return (
    <DialogWindow
      title='Add Client Contact'
      description='Add a new contact person for a client'
      open={isClientAddMode}
      size='sm'
      setOpen={handleCloseDialog}>
      <Form {...form}>
        <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
          <div className='space-y-4'>
            <FormField
              control={form.control}
              name='client_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value ? field.value.toString() : ""}
                    // disabled={!!preselectedClientId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a client' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((client: Client) => (
                        <SelectItem
                          key={client.id}
                          value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter contact name'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='designation'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., Manager, CEO, Director'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='contact@example.com'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='contact_number'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='+91 1234567890'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='contact_type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Type (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., Primary, Finance, Technical'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='flex justify-end gap-3 mt-6'>
            <CustomButton
              text='Cancel'
              variant='outline'
              onClick={() => handleCloseDialog()}
              type='button'
            />
            <CustomButton
              text='Add Contact'
              variant='primary'
              type='submit'
              disabled={addClientContact.isPending}
              disableForViewer
            />
          </div>
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default CreateClientContactDialog;
