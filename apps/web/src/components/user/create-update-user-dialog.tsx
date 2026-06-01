"use client";
import DialogWindow from "@/components/shared/dialog-window";
import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import CustomButton from "@/components/shared/btn";
import Input from "@/components/shared/input";
import { userSchemas, type userTypes } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  KeyRound,
  User,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import { useHandleParams } from "@/hooks/useHandleParams";
import { capitalFirstLetter } from "@pkg/utils";
import { useApiError } from "@/hooks/useApiError";

interface CreatedCredentials {
  name: string;
  email: string;
  password: string;
  role: string;
}

const CreateUpdateUserDialog = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { deleteParams, getParam } = useHandleParams();
  const { handleError } = useApiError();
  const dialog = getParam("dialog");
  const dialogOver = getParam("dialog-over");
  const userId = getParam("id");
  const isEditMode = dialogOver === "update-user";
  const isAddMode = dialog === "create-user";
  const isOpenDialog = isEditMode || isAddMode;
  const trpcUtils = trpc.useUtils();

  const form = useForm<userTypes.CreateUserType>({
    resolver: zodResolver(userSchemas.createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      contact_number: "",
    },
  });

  const {
    data: userQuery,
    isLoading: isUserLoading,
    isSuccess: isUserSuccess,
  } = trpc.userQuery.getUserById.useQuery(
    { id: Number(userId) },
    {
      enabled: !!userId,
    },
  );

  const registerMutation = trpc.userMutation.createUserByAdmin.useMutation({
    onSuccess: (data: any, variables: any) => {
      toast.success("User registered successfully");
      trpcUtils.userQuery.getAllUser.invalidate();

      setCreatedCredentials({
        name: variables.name,
        email: variables.email,
        password: variables.password,
        role: variables.role,
      });

      form.reset();
    },
    onError: (error: any) => {
      console.log(error.data);
      handleError(error, {
        showToast: true,
      });
    },
  });

  const editUserMutation = trpc.userMutation.updateUserByAdmin.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      handleCloseDialog();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  const handleCloseDialog = useCallback(() => {
    if (isAddMode) {
      deleteParams(["id", "dialog"]);
    } else {
      deleteParams(["id", "dialog-over"]);
    }

    setTimeout(() => {
      form.reset({
        contact_number: "",
        email: "",
        name: "",
        password: "",
        role: "office_operator",
      });
    }, 2000);
  }, [deleteParams, form]);

  useEffect(() => {
    if (!isUserLoading) {
      if (isEditMode && isUserSuccess && userQuery) {
        form.reset({
          name: userQuery.name ?? "",
          email: userQuery.email ?? "",
          contact_number: userQuery.contact_number ?? "",
          role: userQuery.role as
            | "manager"
            | "office_operator"
            | "site_operator"
            | "viewer",
          password: "",
        });
      } else if (isAddMode) {
        form.reset({
          contact_number: "",
          email: "",
          name: "",
          password: "",
          role: "office_operator",
        });
        setCreatedCredentials(null);
      }
    }
  }, [isUserSuccess, userQuery, isUserLoading, isEditMode, isAddMode, form]);

  function onSubmit(values: userTypes.CreateUserType) {
    if (isEditMode) {
      editUserMutation.mutate({ id: Number(userId), ...values });
    } else {
      registerMutation.mutate(values as Required<typeof values>);
    }
  }

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyAllCredentials = () => {
    if (createdCredentials) {
      const text = `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
      handleCopy(text, "Credentials");
    }
  };

  const handleDone = () => {
    handleCloseDialog();
    setTimeout(() => {
      setCreatedCredentials(null);
    }, 3000);
  };

  const isSuccessView = !!createdCredentials;

  return (
    <DialogWindow
      title={
        isSuccessView
          ? "User Created Successfully"
          : isEditMode
            ? "Edit User"
            : "Add User"
      }
      description={
        isSuccessView
          ? "Save or share these credentials with the new user. The password cannot be retrieved later."
          : isEditMode
            ? "Update user information"
            : "Create a new user account"
      }
      isLoading={!isSuccessView && isUserLoading}
      open={isOpenDialog}
      setOpen={handleCloseDialog}
      size='sm'
      heightMode='auto'>
      {isSuccessView && createdCredentials ? (
        <div className='px-4 py-6 space-y-4'>
          {/* Warning Banner */}
          <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3'>
            <KeyRound className='h-5 w-5 text-amber-600 mt-0.5 shrink-0' />
            <div className='text-sm'>
              <p className='font-medium text-amber-800'>Important</p>
              <p className='text-amber-700 mt-1'>
                Copy and save these credentials now. The password is only shown
                once and cannot be retrieved later.
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className='bg-gray-50 rounded-lg p-4 space-y-3'>
            <div>
              <p className='text-xs text-gray-500 uppercase tracking-wider'>
                Name
              </p>
              <p className='font-medium'>
                {capitalFirstLetter(createdCredentials.name)}
              </p>
            </div>
            <div>
              <p className='text-xs text-gray-500 uppercase tracking-wider'>
                Role
              </p>
              <p className='font-medium capitalize'>
                {createdCredentials.role.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Credentials with Copy */}
          <div className='space-y-3'>
            {/* Email Field */}
            <div className='flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3'>
              <div className='min-w-0 flex-1'>
                <p className='text-xs text-gray-500 uppercase tracking-wider'>
                  Email
                </p>
                <p className='font-mono text-sm truncate'>
                  {createdCredentials.email}
                </p>
              </div>
              <button
                onClick={() => handleCopy(createdCredentials.email, "Email")}
                className='ml-3 p-2 hover:bg-gray-200 rounded-md transition-colors'
                aria-label='Copy email'>
                {copiedField === "Email" ? (
                  <Check className='h-4 w-4 text-green-600' />
                ) : (
                  <Copy className='h-4 w-4 text-gray-600' />
                )}
              </button>
            </div>

            {/* Password Field */}
            <div className='flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3'>
              <div className='min-w-0 flex-1'>
                <p className='text-xs text-gray-500 uppercase tracking-wider'>
                  Password
                </p>
                <p className='font-mono text-sm'>
                  {createdCredentials.password}
                </p>
              </div>
              <button
                onClick={() =>
                  handleCopy(createdCredentials.password, "Password")
                }
                className='ml-3 p-2 hover:bg-gray-200 rounded-md transition-colors'
                aria-label='Copy password'>
                {copiedField === "Password" ? (
                  <Check className='h-4 w-4 text-green-600' />
                ) : (
                  <Copy className='h-4 w-4 text-gray-600' />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3 pt-2'>
            <CustomButton
              text='Copy All Credentials'
              onClick={handleCopyAllCredentials}
              variant='outline'
              type='button'
              className='flex-1'
            />
            <CustomButton
              text='Done'
              onClick={handleDone}
              variant='primary'
              type='button'
              className='flex-1'
            />
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 px-3.5 py-4'>
            <Input
              control={form.control}
              fieldName='name'
              Label='Name'
              LabelIcon={User}
              placeholder='Enter user name'
            />

            <Input
              control={form.control}
              fieldName='email'
              Label='Email'
              LabelIcon={Mail}
              type='email'
              placeholder='Enter email address'
            />

            {!isEditMode && (
              <Input
                control={form.control}
                fieldName='password'
                Label='Password'
                LabelIcon={KeyRound}
                type={showPassword ? "text" : "password"}
                placeholder='Enter password'
                inputIconButton={{
                  icon: showPassword ? Eye : EyeOff,
                  onClick: () => setShowPassword((s: boolean) => !s),
                }}
              />
            )}

            <Input
              control={form.control}
              fieldName='contact_number'
              Label='Contact Number'
              LabelIcon={Phone}
              type='tel'
              placeholder='Enter contact number'
              optional
            />

            <Input
              control={form.control}
              fieldName='role'
              Label='Role'
              LabelIcon={Shield}
              isSelect
              selectOptions={[
                { label: "Manager", value: "manager" },
                { label: "Office Operator", value: "office_operator" },
                { label: "Site Operator", value: "site_operator" },
                { label: "Viewer", value: "viewer" },
              ]}
              placeholder='Select role'
            />

            <div className='flex gap-2 justify-end pt-4'>
              <CustomButton
                text='Cancel'
                onClick={() => handleCloseDialog()}
                variant='outline'
                type='button'
              />
              <CustomButton
                text={isEditMode ? "Update" : "Create"}
                variant='primary'
                type='submit'
                disableForViewer
              />
            </div>
          </form>
        </Form>
      )}
    </DialogWindow>
  );
};

export default CreateUpdateUserDialog;
