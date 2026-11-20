import DialogWindow from "@/components/shared/dialog-window";
import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import { CheckCircle2, Mail, Search, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import Input from "@/components/shared/input";
import { useApiError } from "@/hooks/useApiError";
import { useOfficeOperatorPages } from "@/hooks/useOfficeOperatorPages";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { officeSchemas, officeTypes } from "@pkg/schema";
import { capitalizeEachWord } from "@pkg/utils";
import useHandleParams from "@/hooks/useHandleParams";
import OfficeInfoFields from "./office-info-fields";

const CreateOfficeDialog = () => {
  const { getParam, deleteParam } = useHandleParams();
  const mode = getParam("dialog");
  const isCreateMode = mode === "create-office";
  const isOpenDialog = isCreateMode;

  console.log(isOpenDialog);

  type SelectedUser = { id: number; name: string; email: string };
  const [selectedOperatorUsers, setSelectedOperatorUsers] = useState<
    SelectedUser[]
  >([]);

  const [operatorSearch, setOperatorSearch] = useState("");
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const form = useForm<officeTypes.createOfficeType>({
    resolver: zodResolver(officeSchemas.createOfficeSchema),
    defaultValues: {
      name: "",
      address: "",
      state: "",
      city: "",
      gst_number: "",
      pincode: "",
      email: "",
    },
  });

  // Earlier pages stay listed as more load.
  const {
    operators,
    hasMore: hasMoreOperators,
    isLoading: isLoadingUserData,
    isLoadingMore: isLoadingMoreOperators,
    loadMore: loadMoreOperators,
  } = useOfficeOperatorPages(operatorSearch, isOpenDialog);

  const handleClose = useCallback(() => {
    deleteParam("dialog");
    form.reset();
    setSelectedOperatorUsers([]);
    setOperatorSearch("");
  }, [deleteParam, form]);

  const createOffice = trpc.officeMutation.createOffice.useMutation({
    onSuccess: () => {
      toast.success("Office created successfully");
      utils.officeQuery.getOffices.invalidate();
      handleClose();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  function onSubmit(values: officeTypes.createOfficeType) {
    createOffice.mutate({
      ...values,
      operator_ids:
        selectedOperatorUsers.length > 0
          ? selectedOperatorUsers.map((u) => u.id)
          : undefined,
    });
  }

  const toggleOperator = (user: SelectedUser) => {
    if (selectedOperatorUsers.some((op) => op.id === user.id)) {
      setSelectedOperatorUsers(
        selectedOperatorUsers.filter((op) => op.id !== user.id),
      );
    } else {
      setSelectedOperatorUsers([...selectedOperatorUsers, user]);
    }
  };

  return (
    <DialogWindow
      open={isOpenDialog}
      setOpen={handleClose}
      isLoading={isLoadingUserData}
      title='Create New Office'
      description='Enter office details and assign office members'
      heightMode='full'
      size='xl'>
      <Form {...form}>
        <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
          <div className='space-y-4'>
            <div className='border-b pb-2'>
              <h3 className='text-base font-semibold text-gray-800'>
                Office Information
              </h3>
            </div>

            <OfficeInfoFields />
          </div>

          <div className='mt-8 space-y-6'>
            <div className='flex items-center justify-between border-b pb-4'>
              <div className='border-b pb-2'>
                <h3 className='text-base font-semibold text-gray-800'>
                  Member Assignment
                </h3>
              </div>
            </div>

            <div className='rounded-xl border bg-gray-100 shadow-xs overflow-hidden'>
              <div className='px-4 pt-4 border-b bg-gray-50'>
                <div className='flex justify-between items-center flex-1 mb-4'>
                  <Input
                    mode='standalone'
                    placeholder='Search office operators...'
                    value={operatorSearch}
                    onChange={setOperatorSearch}
                    inputIcon={Search}
                    className='w-[20rem]'
                  />
                  <span className='text-xs font-medium text-gray-500'>
                    Office Operators
                  </span>
                </div>
              </div>

              <div className='p-4 space-y-4'>
                <ScrollArea className='h-72 pr-3 -mr-3'>
                  <div className='mt-0 space-y-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {operators.map((user: any) => {
                      const isSelected = selectedOperatorUsers.some(
                        (op) => op.id === user.id,
                      );
                      return (
                        <div
                          key={user.id}
                          onClick={() =>
                            toggleOperator({
                              id: user.id,
                              name: user.name,
                              email: user.email,
                            })
                          }
                          className={cn(
                            "group flex m-0 bg-white items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                            isSelected
                              ? "border-[#035864] bg-[#035864]/5 ring-[#035864]"
                              : "border-gray-200 hover:border-[#035864]/30 hover:bg-gray-50/80",
                          )}>
                          <div className='flex items-center gap-3'>
                            <div
                              className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors shadow-sm",
                                isSelected
                                  ? "bg-[#035864] text-white"
                                  : "bg-white border text-gray-500 group-hover:border-[#035864]/30 group-hover:text-[#035864]",
                              )}>
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p
                                className={cn(
                                  "font-medium text-sm transition-colors",
                                  isSelected
                                    ? "text-[#035864]"
                                    : "text-gray-900",
                                )}>
                                {capitalizeEachWord(user.name)}
                              </p>
                              <p className='text-xs text-gray-500 flex items-center gap-1.5 mt-0.5'>
                                <Mail className='h-3 w-3' />
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-3'>
                            {isSelected ? (
                              <CheckCircle2 className='h-5 w-5 text-[#035864]' />
                            ) : (
                              <div className='h-5 w-5 rounded-full border border-gray-200 group-hover:border-[#035864]/50' />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {!isLoadingUserData && operators.length === 0 && (
                      <div className='flex flex-col items-center justify-center py-10 text-gray-500'>
                        <div className='h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3'>
                          <Users className='h-6 w-6 text-gray-400' />
                        </div>
                        <p className='text-sm font-medium'>
                          No operators found
                        </p>
                        <p className='text-xs text-gray-400 mt-1'>
                          Try adjusting your search
                        </p>
                      </div>
                    )}
                    {hasMoreOperators && (
                      <button
                        type='button'
                        onClick={loadMoreOperators}
                        disabled={isLoadingMoreOperators}
                        className='w-full py-2.5 text-xs font-medium text-gray-500 hover:text-[#035864] hover:bg-gray-50 border border-dashed rounded-md transition-colors disabled:cursor-wait disabled:opacity-60'>
                        {isLoadingMoreOperators
                          ? "Loading operators..."
                          : "Load more operators..."}
                      </button>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {selectedOperatorUsers.length > 0 && (
              <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
                  Currently Selected
                </p>
                <div className='flex flex-wrap gap-2'>
                  {selectedOperatorUsers.map((op: any) => (
                    <div
                      key={op.id}
                      className='inline-flex items-center gap-2 bg-white border border-[#035864]/20 shadow-xs rounded-full pl-1.5 pr-3 py-1 text-sm text-gray-700 animate-in fade-in zoom-in-95 duration-200'>
                      <div className='h-6 w-6 rounded-full bg-white border border-[#035864] text-[#035864] flex items-center justify-center text-[10px] font-bold'>
                        {op.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className='font-medium text-gray-900 text-xs'>
                        {capitalizeEachWord(op.name)}
                      </span>
                      <button
                        type='button'
                        onClick={() => toggleOperator(op as SelectedUser)}
                        className='ml-1 text-gray-400 hover:text-red-500 transition-colors'>
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className='flex justify-end gap-4 mt-4 pt-4 border-t'>
            <CustomButton
              type='button'
              text='Cancel'
              variant='secondary'
              onClick={() => {
                handleClose();
              }}
            />
            <CustomButton
              type='submit'
              text='Create Office'
              variant='primary'
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
              disableForViewer
            />
          </div>
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default CreateOfficeDialog;
