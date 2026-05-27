import React from "react";
import { Mail, Phone, UserPlus } from "lucide-react";
import CustomDialogWindow from "@/components/shared/dialog-window";
import { clientTypes } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import toast from "react-hot-toast";
import { useApiError } from "@/hooks/useApiError";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchemas } from "@pkg/schema";
import { Input } from "@/components/ui/input";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface Props {
  open: boolean;
  onClose: () => void;
  users?: clientTypes.clientUsersType[];
  clientId: string;
}

const ContactDialog = ({ open, onClose, users, clientId }: Props) => {
  const [addOpen, setAddOpen] = React.useState(false);
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const addClientContact = trpc.clientMutation.createClientContact.useMutation({
    onSuccess: async () => {
      toast.success("Contact added successfully");
      await utils.clientQuery.getClient.invalidate({
        clientId: Number(clientId),
      });
      setAddOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  const form = useForm<clientTypes.createClientContactInput>({
    resolver: zodResolver(clientSchemas.createClientContactSchema),
    defaultValues: {
      client_id: Number(clientId),
      name: "",
      designation: "",
      contact_number: "",
      email: "",
      contact_type: "",
    },
  });

  async function onSubmit(values: clientTypes.createClientContactInput) {
    await addClientContact.mutateAsync({
      ...values,
      client_id: Number(clientId),
    });
  }

  const handleSetOpen = (next: boolean) => {
    if (!next) {
      setAddOpen(false);
      onClose();
    }
  };

  return (
    <>
      <CustomDialogWindow
        title='Contacts'
        description='List of client contacts'
        open={open}
        setOpen={handleSetOpen}
        size='sm'>
        <div className='flex flex-col justify-between'>
          <div className='p-4 space-y-3 flex-1'>
            <div className='flex justify-end'>
              <CustomButton
                text='Add Contact'
                variant='primary'
                Icon={UserPlus}
                className='h-8'
                disableForViewer
                onClick={() => {
                  form.reset({
                    client_id: Number(clientId),
                    name: "",
                    designation: "",
                    contact_number: "",
                    email: "",
                    contact_type: "",
                  });
                  setAddOpen(true);
                }}
              />
            </div>

          {users && users.length > 0 ? (
            users.map((u) => (
              <div
                key={u.id}
                className='flex items-center justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='text-sm font-medium text-slate-700 truncate'>
                    {u.name}
                    <span className='ml-2'>(</span>
                    <span className=' text-xs text-slate-500'>
                      {u.designation || "User"}
                    </span>
                    <span>, </span>
                    <span className='ml-1 text-xs text-slate-500'>
                      {u.contact_type}
                    </span>
                    <span>)</span>
                  </div>
                  <div className='text-xs text-slate-500 truncate max-w-[300px]'>
                    {u.email}
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  <a
                    href={`mailto:${u.email}`}
                    className='text-slate-400 hover:text-slate-600'
                    title='Email'>
                    <Mail className='size-4' />
                  </a>
                  <a
                    href={`tel:${u.contact_number}`}
                    className='text-slate-400 hover:text-slate-600'
                    title='Call'>
                    <Phone className='size-4' />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className='text-sm text-slate-500'>No client users found.</div>
          )}
          </div>

          <div className='px-4 py-3 border-t text-right w-full'>
            <button
              onClick={() => onClose()}
              className='px-3 py-1 rounded bg-gray-100 hover:bg-gray-200'>
              Close
            </button>
          </div>
        </div>
      </CustomDialogWindow>

      <CustomDialogWindow
        title='Add Contact'
        description='Add a new contact for this client'
        open={addOpen}
        setOpen={(next) => {
          if (!next) {
            setAddOpen(false);
            form.reset();
          }
        }}
        size='sm'>
        <Form {...form}>
          <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
            <div className='space-y-4 p-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter contact name' {...field} />
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
                      <Input placeholder='contact@example.com' {...field} />
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
                      <Input placeholder='+91 1234567890' {...field} />
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

            <div className='flex justify-end gap-3 px-4 pb-4'>
              <CustomButton
                text='Cancel'
                variant='outline'
                type='button'
                onClick={() => {
                  setAddOpen(false);
                  form.reset();
                }}
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
      </CustomDialogWindow>
    </>
  );
};

export default ContactDialog;
