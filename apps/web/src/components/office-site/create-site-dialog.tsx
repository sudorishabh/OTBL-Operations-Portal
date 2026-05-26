"use client";
import React, { useEffect, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DialogWindow from "@/components/shared/dialog-window";
import { Form } from "@/components/ui/form";
import CustomButton from "@/components/shared/btn";
import { trpc } from "@/lib/trpc";
import CustomForm from "@/components/shared/form";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/shared/input";
import {
  Building2,
  MapPin,
  Globe,
  Hash,
  Search,
  Users,
  CheckCircle2,
  X,
  Mail,
} from "lucide-react";
import { useApiError } from "@/hooks/useApiError";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { siteSchemas, type siteTypes } from "@pkg/schema";
import useHandleParams from "@/hooks/useHandleParams";
import { capitalizeEachWord, constants } from "@pkg/utils";

const { ROLES } = constants;

const CreateSiteDialog = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { deleteParams, getParam } = useHandleParams();
  const dialog = getParam("dialog");
  const officeId = getParam("officeId");
  const officeName = getParam("officeName");
  const siteId = getParam("siteId");
  const isCreateMode = dialog === "create-site";
  const isEditMode = dialog === "update-site";
  const isOpenDialog = isCreateMode || isEditMode;

  const form = useForm<siteTypes.siteBaseType>({
    resolver: zodResolver(siteSchemas.siteBaseSchema),
    defaultValues: {
      name: "",
      address: "",
      state: "",
      city: "",
      pincode: "",
    },
  });

  type SelectedUser = { id: number; name: string; email: string };
  const [selectedOperators, setSelectedOperators] = useState<SelectedUser[]>(
    [],
  );
  const [operatorSearch, setOperatorSearch] = useState("");
  const [operatorPage, setOperatorPage] = useState(1);
  const itemsPerPage = 20;

  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const { data: operatorsData, isLoading: isLoadingOperators } =
    trpc.userQuery.getUsersByRole.useQuery(
      {
        role: ROLES.OPERATOR,
        page: operatorPage,
        limit: itemsPerPage,
        search: operatorSearch,
      },
      {
        enabled: isCreateMode,
      },
    );

  const operators = operatorsData?.users || [];
  const hasMoreOperators = operatorsData?.pagination?.hasMore || false;

  const { data: siteData, isLoading: isSiteLoading } =
    trpc.siteQuery.getSite.useQuery(
      { siteId: Number(siteId) },
      { enabled: isEditMode && !!siteId },
    );

  const createSite = trpc.siteMutation.createSite.useMutation({
    onSuccess: () => {
      toast.success("Site added successfully");
      utils.officeQuery.getOffices.invalidate();
      utils.siteQuery.getSitesByOfficeId.invalidate();
      handleClose();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  const editSite = trpc.siteMutation.updateSite.useMutation({
    onSuccess: () => {
      toast.success("Site updated successfully");
      utils.officeQuery.getOffices.invalidate();
      utils.siteQuery.getSitesByOfficeId.invalidate();
      handleClose();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  const handleClose = useCallback(() => {
    deleteParams(["dialog", "officeId", "officeName", "siteId"]);
    form.reset({
      name: "",
      address: "",
      city: "",
      pincode: "",
      state: "",
    });
    setSelectedOperators([]);
    setOperatorSearch("");
    setOperatorPage(1);
  }, [searchParams, router, form]);

  const toggleOperator = (user: SelectedUser) => {
    if (selectedOperators.some((u) => u.id === user.id)) {
      setSelectedOperators(selectedOperators.filter((u) => u.id !== user.id));
    } else {
      setSelectedOperators([...selectedOperators, user]);
    }
  };

  useEffect(() => {
    if (isEditMode && siteData && !isSiteLoading) {
      form.reset({
        name: siteData.name || "",
        address: siteData.address || "",
        city: siteData.city || "",
        state: siteData.state || "",
        pincode: siteData.pincode || "",
      });
    } else if (isCreateMode) {
      form.reset({
        name: "",
        address: "",
        city: "",
        pincode: "",
        state: "",
      });
    }
  }, [isEditMode, isCreateMode, siteData, isSiteLoading, form]);

  async function onSubmit(values: siteTypes.siteBaseType) {
    try {
      if (isEditMode && siteId) {
        await editSite.mutateAsync({ ...values, siteId: Number(siteId) });
      } else if (isCreateMode && officeId) {
        await createSite.mutateAsync({
          ...values,
          office_id: Number(officeId),
          operator_ids:
            selectedOperators.length > 0
              ? selectedOperators.map((u) => u.id)
              : undefined,
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  }

  return (
    <DialogWindow
      title={
        isEditMode
          ? "Edit Site"
          : `Add Site${officeName ? ` to ${officeName}` : ""}`
      }
      description={
        isEditMode
          ? "Update site information"
          : "Create a new site and assign operators"
      }
      open={isOpenDialog}
      size={isCreateMode ? "lg" : "sm"}
      isLoading={isSiteLoading || (isCreateMode && isLoadingOperators)}
      setOpen={handleClose}>
      <Form {...form}>
        <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
          <div className='max-h-[60vh] overflow-y-auto pr-2 space-y-6'>
            <div className='space-y-4'>
              {isCreateMode && (
                <div className='border-b pb-2'>
                  <h3 className='text-base font-semibold text-gray-800'>
                    Site Information
                  </h3>
                </div>
              )}

              <Input
                control={form.control}
                fieldName='name'
                Label='Site Name'
                LabelIcon={Building2}
                placeholder='Enter site name'
              />

              <Input
                control={form.control}
                fieldName='address'
                Label='Address'
                LabelIcon={MapPin}
                placeholder='Enter address'
              />

              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <Input
                  control={form.control}
                  fieldName='city'
                  Label='City'
                  LabelIcon={Globe}
                  placeholder='Enter city'
                />

                <Input
                  control={form.control}
                  fieldName='state'
                  Label='State'
                  LabelIcon={Globe}
                  placeholder='Enter state'
                />

                <Input
                  control={form.control}
                  fieldName='pincode'
                  Label='Pincode'
                  LabelIcon={Hash}
                  placeholder='Enter pincode'
                />
              </div>
            </div>

            {/* Operator Assignment Section - Only in Add Mode */}
            {isCreateMode && (
              <div className='space-y-4'>
                <div className='border-b pb-2'>
                  <h3 className='text-base font-semibold text-gray-800'>
                    Assign Operators
                  </h3>
                </div>

                <div className='rounded-xl border bg-gray-100 shadow-xs overflow-hidden'>
                  <div className='px-4 pt-4 border-b bg-gray-50'>
                    <div className='flex justify-between items-center flex-1 mb-4'>
                      <Input
                        mode='standalone'
                        placeholder='Search operators...'
                        value={operatorSearch}
                        onChange={(value) => {
                          setOperatorSearch(value);
                          setOperatorPage(1);
                        }}
                        inputIcon={Search}
                        className='w-full max-w-[20rem]'
                      />
                    </div>
                  </div>

                  <div className='p-4'>
                    <ScrollArea className='h-56 pr-3 -mr-3'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                        {operators.map((user: any) => {
                          const isSelected = selectedOperators.some(
                            (u) => u.id === user.id,
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
                                "group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                                isSelected
                                  ? "border-[#035864] bg-[#035864]/5 ring-[#035864]"
                                  : "border-gray-100 hover:border-[#035864]/30 hover:bg-gray-50/80",
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
                        {!isLoadingOperators && operators.length === 0 && (
                          <div className='col-span-2 flex flex-col items-center justify-center py-10 text-gray-500'>
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
                      </div>
                      {hasMoreOperators && (
                        <button
                          type='button'
                          onClick={() => setOperatorPage((p) => p + 1)}
                          className='w-full mt-3 py-2.5 text-xs font-medium text-gray-500 hover:text-[#035864] hover:bg-gray-50 border border-dashed rounded-md transition-colors'>
                          Load more operators...
                        </button>
                      )}
                    </ScrollArea>
                  </div>
                </div>

                {/* Selected Operators Summary */}
                {selectedOperators.length > 0 && (
                  <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                    <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3'>
                      Selected Operators ({selectedOperators.length})
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {selectedOperators.map((op) => {
                        return (
                          <div
                            key={op.id}
                            className='inline-flex items-center gap-2 bg-white border border-[#035864]/20 shadow-xs rounded-full pl-1.5 pr-3 py-1 text-sm text-gray-700 animate-in fade-in zoom-in-95 duration-200'>
                            <div className='h-6 w-6 rounded-full bg-[#035864] text-white flex items-center justify-center text-[10px] font-bold'>
                              {op.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className='font-medium text-gray-900 text-xs'>
                              {op.name}
                            </span>
                            <button
                              type='button'
                              onClick={() => toggleOperator(op)}
                              className='ml-1 text-gray-400 hover:text-red-500 transition-colors'>
                              <X className='h-3.5 w-3.5' />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className='flex justify-end gap-4 pt-4 border-t'>
              <CustomButton
                type='button'
                text='Cancel'
                variant='secondary'
                onClick={handleClose}
              />
              <CustomButton
                type='submit'
                text={isEditMode ? "Update" : "Create Site"}
                variant='primary'
                loading={form.formState.isSubmitting}
                disabled={form.formState.isSubmitting}
              />
            </div>
          </div>
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default CreateSiteDialog;
