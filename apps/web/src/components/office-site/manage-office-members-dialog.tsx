"use client";

import React, { useCallback, useEffect, useState } from "react";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import { trpc } from "@/lib/trpc";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import { useIsAdmin, useIsViewer } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  Mail,
  Search,
  UserMinus,
  Users,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { capitalizeEachWord, constants } from "@pkg/utils";
import toast from "react-hot-toast";
import { useApiError } from "@/hooks/useApiError";
import Loading from "@/components/loading/Loading";

const { ROLES } = constants;

type PickedUser = { id: number; name: string; email: string };

const ManageOfficeMembersDialog = () => {
  const isViewer = useIsViewer();
  // Only admins may appoint/revoke the office manager. Office managers can
  // manage office operators only, so the manager-seat controls are hidden
  // for non-admins (the server enforces this too).
  const isAdmin = useIsAdmin();
  const { getParam, deleteParams } = useHandleParams();
  const isOpen = getParam("dialog") === "manage-office-members";
  const officeIdParam = getParam("officeId");
  const officeName = getParam("officeName");
  const office_id = officeIdParam ? Number(officeIdParam) : 0;

  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const [activeTab, setActiveTab] = useState<"managers" | "operators">(
    isAdmin ? "managers" : "operators",
  );
  const [managerSearch, setManagerSearch] = useState("");
  const [operatorSearch, setOperatorSearch] = useState("");
  const [managerPage, setManagerPage] = useState(1);
  const [operatorPage, setOperatorPage] = useState(1);
  const [managerResults, setManagerResults] = useState<any[]>([]);
  const [operatorResults, setOperatorResults] = useState<any[]>([]);
  const itemsPerPage = 50;

  const { data, isLoading, isFetching } = trpc.officeQuery.getOfficeUsers.useQuery(
    { office_id },
    { enabled: isOpen && office_id > 0 },
  );

  const { data: managersData, isLoading: loadingManagers } =
    trpc.userQuery.getUsersByRole.useQuery(
      {
        role: ROLES.MANAGER,
        page: managerPage,
        limit: itemsPerPage,
        search: managerSearch,
      },
      { enabled: isOpen && activeTab === "managers", refetchOnMount: "always" },
    );

  const { data: operatorsData, isLoading: loadingOperators } =
    trpc.userQuery.getUsersByRole.useQuery(
      {
        role: ROLES.OFFICE_OPERATOR,
        page: operatorPage,
        limit: itemsPerPage,
        search: operatorSearch,
      },
      { enabled: isOpen && activeTab === "operators", refetchOnMount: "always" },
    );

  useEffect(() => {
    setManagerPage(1);
    setManagerResults([]);
  }, [managerSearch]);

  useEffect(() => {
    setOperatorPage(1);
    setOperatorResults([]);
  }, [operatorSearch]);

  useEffect(() => {
    if (!managersData?.users) return;
    if (managerPage === 1) {
      setManagerResults(managersData.users);
    } else {
      setManagerResults((prev) => {
        const ids = new Set(prev.map((u: { id: number }) => u.id));
        const next = managersData.users.filter(
          (u: { id: number }) => !ids.has(u.id),
        );
        return [...prev, ...next];
      });
    }
  }, [managersData?.users, managerPage]);

  useEffect(() => {
    if (!operatorsData?.users) return;
    if (operatorPage === 1) {
      setOperatorResults(operatorsData.users);
    } else {
      setOperatorResults((prev) => {
        const ids = new Set(prev.map((u: { id: number }) => u.id));
        const next = operatorsData.users.filter(
          (u: { id: number }) => !ids.has(u.id),
        );
        return [...prev, ...next];
      });
    }
  }, [operatorsData?.users, operatorPage]);

  const removeUser = trpc.officeMutation.removeUserFromOffice.useMutation();
  const assignUser = trpc.officeMutation.assignUserToOffice.useMutation();

  const invalidateOffice = useCallback(async () => {
    await utils.officeQuery.getOfficeUsers.invalidate({ office_id });
    await utils.officeQuery.getOffices.invalidate();
  }, [utils, office_id]);

  const handleClose = useCallback(() => {
    deleteParams(["dialog", "officeId", "officeName"]);
    setActiveTab(isAdmin ? "managers" : "operators");
    setManagerSearch("");
    setOperatorSearch("");
    setManagerPage(1);
    setOperatorPage(1);
  }, [deleteParams, isAdmin]);

  const onRemove = async (userId: number, label: string) => {
    try {
      await removeUser.mutateAsync({ office_id, user_id: userId });
      toast.success(`${label} removed from office`);
      await invalidateOffice();
    } catch (e) {
      handleError(e, { showToast: true });
    }
  };

  const onAssignManager = async (user: PickedUser) => {
    try {
      if (data?.manager && data.manager.id !== user.id) {
        await removeUser.mutateAsync({
          office_id,
          user_id: data.manager.id,
        });
      }
      await assignUser.mutateAsync({
        office_id,
        user_id: user.id,
        role: "office_manager",
      });
      toast.success("Manager assigned");
      await invalidateOffice();
    } catch (e) {
      handleError(e, { showToast: true });
    }
  };

  const onAssignOperator = async (user: PickedUser) => {
    try {
      await assignUser.mutateAsync({
        office_id,
        user_id: user.id,
        role: "operator",
      });
      toast.success("Office operator assigned");
      await invalidateOffice();
    } catch (e) {
      handleError(e, { showToast: true });
    }
  };

  const managers = managerResults;
  const operators = operatorResults;
  const hasMoreManagers = managersData?.pagination?.hasMore ?? false;
  const hasMoreOperators = operatorsData?.pagination?.hasMore ?? false;

  const busy =
    removeUser.isPending ||
    assignUser.isPending ||
    isFetching ||
    isLoading;

  const operatorIds = new Set(
    (data?.operators ?? []).map((o: { id: number }) => o.id),
  );

  return (
    <DialogWindow
      open={isOpen}
      setOpen={handleClose}
      isLoading={isOpen && office_id > 0 && isLoading}
      title='Manage office members'
      description={`Assign or remove managers and office operators for ${officeName || "this office"}`}
      heightMode='full'
      size='xl'>
      {isOpen && office_id > 0 ? (
        <div className='space-y-6'>
          <div className='rounded-lg border bg-slate-50/80 p-4 space-y-3'>
            <p className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
              Currently assigned
            </p>
            {isLoading ? (
              <Loading />
            ) : (
              <div className='space-y-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-xs text-slate-600 w-20 shrink-0'>
                    Manager
                  </span>
                  {data?.manager ? (
                    <span className='inline-flex items-center gap-2 rounded-full border bg-white pl-2 pr-1 py-1 text-xs'>
                      <span className={cn("font-medium", !isAdmin && "pr-1")}>
                        {capitalizeEachWord(data.manager.name || "")}
                      </span>
                      {isAdmin && (
                        <button
                          type='button'
                          disabled={busy || isViewer}
                          onClick={() =>
                            onRemove(data.manager!.id, "Manager")
                          }
                          className='rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50'
                          aria-label='Remove manager'>
                          <UserMinus className='h-3.5 w-3.5' />
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className='text-xs text-slate-500'>None</span>
                  )}
                </div>
                <div className='flex flex-wrap gap-2 items-start'>
                  <span className='text-xs text-slate-600 w-20 shrink-0 pt-1.5'>
                    Office Operators
                  </span>
                  <div className='flex flex-wrap gap-2 flex-1'>
                    {(data?.operators?.length ?? 0) === 0 ? (
                      <span className='text-xs text-slate-500'>None</span>
                    ) : (
                      data?.operators.map((op: { id: number; name: string }) => (
                        <span
                          key={op.id}
                          className='inline-flex items-center gap-2 rounded-full border bg-white pl-2 pr-1 py-1 text-xs'>
                          <span className='font-medium'>
                            {capitalizeEachWord(op.name || "")}
                          </span>
                          <button
                            type='button'
                            disabled={busy || isViewer}
                            onClick={() =>
                              onRemove(op.id, "Operator")
                            }
                            className='rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50'
                            aria-label={`Remove ${op.name}`}>
                            <UserMinus className='h-3.5 w-3.5' />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className='rounded-xl border bg-gray-100 shadow-xs overflow-hidden'>
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as "managers" | "operators")
              }
              className='w-full'>
              <div className='px-4 pt-4 border-b bg-gray-50'>
                <div className='flex justify-between items-center flex-1 mb-4 gap-3 flex-wrap'>
                  <Input
                    mode='standalone'
                    placeholder={
                      activeTab === "managers"
                        ? "Search managers..."
                        : "Search operators..."
                    }
                    value={
                      activeTab === "managers"
                        ? managerSearch
                        : operatorSearch
                    }
                    onChange={(value) => {
                      if (activeTab === "managers") {
                        setManagerSearch(value);
                        setManagerPage(1);
                      } else {
                        setOperatorSearch(value);
                        setOperatorPage(1);
                      }
                    }}
                    inputIcon={Search}
                    className='w-[20rem] max-w-full'
                  />
                  <TabsList className='bg-gray-300/60 h-8!'>
                    {isAdmin && (
                      <TabsTrigger
                        value='managers'
                        className='text-xs cursor-pointer'>
                        Managers
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value='operators'
                      className='text-xs cursor-pointer'>
                      Office Operators
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className='p-4'>
                <ScrollArea className='h-72 pr-3 -mr-3'>
                  <TabsContent
                    value='managers'
                    className='mt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                    {managers.map((user: any) => {
                      const isCurrent = data?.manager?.id === user.id;
                      return (
                        <div
                          key={user.id}
                          className={cn(
                            "group flex m-0 bg-white items-center justify-between p-3 rounded-lg border transition-all",
                            isCurrent
                              ? "border-[#035864]/40 bg-[#035864]/5"
                              : "border-gray-200",
                          )}>
                          <div className='flex items-center gap-3 min-w-0'>
                            <div
                              className={cn(
                                "h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm",
                                isCurrent
                                  ? "bg-[#035864] text-white"
                                  : "bg-white border text-gray-500",
                              )}>
                              {String(user.name).slice(0, 2).toUpperCase()}
                            </div>
                            <div className='min-w-0'>
                              <p className='font-medium text-sm text-gray-900 truncate'>
                                {capitalizeEachWord(user.name)}
                              </p>
                              <p className='text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 truncate'>
                                <Mail className='h-3 w-3 shrink-0' />
                                <span className='truncate'>{user.email}</span>
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2 shrink-0'>
                            {isCurrent ? (
                              <CheckCircle2 className='h-5 w-5 text-[#035864]' />
                            ) : (
                              <CustomButton
                                type='button'
                                text='Assign'
                                variant='outline'
                                className='h-8 text-xs px-3'
                                disabled={busy}
                                disableForViewer
                                onClick={() =>
                                  onAssignManager({
                                    id: user.id,
                                    name: user.name,
                                    email: user.email,
                                  })
                                }
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {!loadingManagers && managers.length === 0 && (
                      <div className='col-span-full flex flex-col items-center justify-center py-10 text-gray-500'>
                        <UserCheck className='h-8 w-8 text-gray-400 mb-2' />
                        <p className='text-sm'>No managers found</p>
                      </div>
                    )}
                    {hasMoreManagers && (
                      <button
                        type='button'
                        onClick={() => setManagerPage((p) => p + 1)}
                        className='col-span-full py-2.5 text-xs font-medium text-gray-500 hover:text-[#035864] border border-dashed rounded-md'>
                        Load more managers...
                      </button>
                    )}
                  </TabsContent>

                  <TabsContent
                    value='operators'
                    className='mt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                    {operators.map((user: any) => {
                      const isAssigned = operatorIds.has(user.id);
                      return (
                        <div
                          key={user.id}
                          className={cn(
                            "group flex m-0 bg-white items-center justify-between p-3 rounded-lg border transition-all",
                            isAssigned
                              ? "border-[#035864]/40 bg-[#035864]/5"
                              : "border-gray-200",
                          )}>
                          <div className='flex items-center gap-3 min-w-0'>
                            <div
                              className={cn(
                                "h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm",
                                isAssigned
                                  ? "bg-[#035864] text-white"
                                  : "bg-white border text-gray-500",
                              )}>
                              {String(user.name).slice(0, 2).toUpperCase()}
                            </div>
                            <div className='min-w-0'>
                              <p className='font-medium text-sm text-gray-900 truncate'>
                                {capitalizeEachWord(user.name)}
                              </p>
                              <p className='text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 truncate'>
                                <Mail className='h-3 w-3 shrink-0' />
                                <span className='truncate'>{user.email}</span>
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2 shrink-0'>
                            {isAssigned ? (
                              <CheckCircle2 className='h-5 w-5 text-[#035864]' />
                            ) : (
                              <CustomButton
                                type='button'
                                text='Add'
                                variant='outline'
                                className='h-8 text-xs px-3'
                                disabled={busy}
                                disableForViewer
                                onClick={() =>
                                  onAssignOperator({
                                    id: user.id,
                                    name: user.name,
                                    email: user.email,
                                  })
                                }
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {!loadingOperators && operators.length === 0 && (
                      <div className='col-span-full flex flex-col items-center justify-center py-10 text-gray-500'>
                        <Users className='h-8 w-8 text-gray-400 mb-2' />
                        <p className='text-sm'>No operators found</p>
                      </div>
                    )}
                    {hasMoreOperators && (
                      <button
                        type='button'
                        onClick={() => setOperatorPage((p) => p + 1)}
                        className='col-span-full py-2.5 text-xs font-medium text-gray-500 hover:text-[#035864] border border-dashed rounded-md'>
                        Load more operators...
                      </button>
                    )}
                  </TabsContent>
                </ScrollArea>
              </div>
            </Tabs>
          </div>

          <div className='flex justify-end pt-2 border-t'>
            <CustomButton
              type='button'
              text='Done'
              variant='primary'
              onClick={handleClose}
            />
          </div>
        </div>
      ) : null}
    </DialogWindow>
  );
};

export default ManageOfficeMembersDialog;
