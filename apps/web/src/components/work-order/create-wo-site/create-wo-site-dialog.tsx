import { Button } from "@/components/ui/button";
import DialogWindow from "@/components/shared/dialog-window";
import { Form } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { workOrderSchemas } from "@pkg/schema";
import { capitalFirstLetter, constants } from "@pkg/utils";
import Input from "@/components/shared/input";
import { format } from "date-fns";

const { allActivityOptions } = constants;

const { createWorkOrderSiteSchema } = workOrderSchemas;
import {
  Loader2,
  Plus,
  Building2,
  Search,
  Check,
  CalendarDays,
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import useHandleParams from "@/hooks/useHandleParams";
import CustomButton from "@/components/shared/btn";
import WOSiteCreationWay from "./wo-site-creation-way";

interface Props {
  workOrder: any;
  scheduleOfRates: any[];
}

const CreateWorkOrderSiteDialog = ({ workOrder, scheduleOfRates }: Props) => {
  const [step, setStep] = useState(1);
  const [siteChoice, setSiteChoice] = useState<"existing" | "new">("existing");
  const [searchTerm, setSearchTerm] = useState("");
  const [allSites, setAllSites] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const sitesLimit = 50;

  const { getParam, deleteParam } = useHandleParams();
  const isDialogOpen = getParam("dialog") === "create-wo-site";
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const utils = trpc.useUtils();

  const isWorkOrderCompleted = workOrder?.status === "completed";

  const form = useForm<z.infer<typeof createWorkOrderSiteSchema>>({
    resolver: zodResolver(createWorkOrderSiteSchema) as any,
    defaultValues: {
      work_order_id: workOrder.id,
      client_id: workOrder.client_id,
      selected_activities: [],
      new_site: undefined,
    },
  });

  const {
    reset,
    handleSubmit,
    watch,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = form;

  const {
    data: sitesData,
    isLoading: isLoadingSites,
    isFetching: isFetchingSites,
  } = trpc.siteQuery.getSitesByOfficeId.useQuery(
    {
      office_id: workOrder.office_id,
      page: currentPage,
      limit: sitesLimit,
      searchQuery: debouncedSearchTerm,
    },
    {
      enabled:
        !!workOrder.office_id &&
        isDialogOpen &&
        siteChoice === "existing" &&
        step === 2,
    },
  );

  useEffect(() => {
    if (sitesData?.sites && !isFetchingSites) {
      setAllSites((prev) => {

        let nextSites: any[] = [];
        if (currentPage === 1) {
          nextSites = sitesData.sites;
        } else {
          const existingIds = new Set(prev.map((s: any) => s.id));
          const newUniqueSites = sitesData.sites.filter(
            (s: any) => !existingIds.has(s.id),
          );

          if (newUniqueSites.length === 0) return prev;
          nextSites = [...prev, ...newUniqueSites];
        }

        if (
          prev.length === nextSites.length &&
          prev.every((p: any, i: number) => p.id === nextSites[i].id)
        ) {
          return prev;
        }

        return nextSites;
      });
    }
  }, [sitesData, currentPage, isFetchingSites]);

  useEffect(() => {
    setCurrentPage(1);
    setAllSites([]);
  }, [debouncedSearchTerm]);

  const handleDialogClose = () => {
    deleteParam("dialog");
  };

  useEffect(() => {
    if (isDialogOpen && isWorkOrderCompleted) {
      toast.error("Work order is completed. You can't add more sites.");
      handleDialogClose();
    }
  }, [isDialogOpen, isWorkOrderCompleted]);

  useEffect(() => {
    if (!isDialogOpen) {
      setStep(1);
      reset();
      setCurrentPage(1);
      setAllSites([]);
    }
  }, [isDialogOpen, reset]);
  const addSiteMutation =
    trpc.workOrderMutation.createWorkOrderSite.useMutation({
      onSuccess: () => {
        toast.success("Site added successfully");
        utils.workOrderQuery.getWorkOrderDetails.invalidate({
          id: workOrder.id,
        });
        if (siteChoice === "new") {
          utils.siteQuery.getSitesByOfficeId.invalidate({
            office_id: workOrder.office_id,
          });
        }
        utils.workOrderQuery.getWorkOrderSites.invalidate({
          id: workOrder.id,
        });
        handleDialogClose();
        reset();
        setStep(1);
      },
      onError: (error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to add the site. Please try again.";
        toast.error(message);
      },
    });

  const createSiteMutation = trpc.siteMutation.createSite.useMutation();

  // A site only does bioremediation, so it takes the work order's
  // bioremediation activities without the user picking them.
  const bioremediationActivities = useMemo(() => {
    const bioremediation = new Set(
      allActivityOptions
        .filter((activity) => activity.isBioremediation)
        .map((activity) => activity.value),
    );

    return (scheduleOfRates ?? []).flatMap((sor: any) => {
      const name =
        typeof sor.activity === "object" ? sor.activity.name : sor.activity;
      return bioremediation.has(name)
        ? [{ name, unit: sor.unit, schedule_of_rate_id: sor.id }]
        : [];
    });
  }, [scheduleOfRates]);

  const onSubmit = async (data: z.infer<typeof createWorkOrderSiteSchema>) => {
    try {
      if (siteChoice === "new" && data.new_site) {
        const siteResult = await createSiteMutation.mutateAsync({
          ...data.new_site,
          office_id: workOrder.office_id,
        } as any);

        if ((siteResult as any).id) {
          data.site_id = (siteResult as any).id;
        } else {
          toast.error("Failed to create site");
          return;
        }
      }

      if (!data.site_id) {
        toast.error("Please select or create a site");
        return;
      }

      addSiteMutation.mutate({
        ...data,
        selected_activities: bioremediationActivities,
      });
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  const selectedSiteId = watch("site_id");

  return (
    <DialogWindow
      open={isDialogOpen}
      setOpen={(open) => {
        if (!open) handleDialogClose();
      }}
      title='Add Bioremediation Site'
      size='lg'>
      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit, (errors) => {
            console.error("Form validation errors:", errors);
            toast.error("Please fill in all required fields correctly");
          })}
          className='space-y-4'>
          {step === 1 ? (
            <WOSiteCreationWay
              setSiteChoice={setSiteChoice}
              setStep={setStep}
              setValue={setValue}
              clearErrors={clearErrors}
              workOrder={workOrder}
            />
          ) : (
            step === 2 && (
              <div className='space-y-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    type='button'
                    onClick={() => setStep(1)}
                    className='h-8 cursor-pointer'>
                    &larr; Back to Choice
                  </Button>
                  <div className='h-px flex-1 bg-border' />
                  <span className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    {siteChoice === "existing"
                      ? "Select Existing Site"
                      : "Enter New Site Details"}
                  </span>
                </div>

                <div className='pt-4'>
                  <div className='h-px w-full bg-slate-100 mb-6' />
                  <div className='flex items-center gap-2 mb-4'>
                    <div className='p-1.5 bg-slate-100 rounded-lg text-slate-500'>
                      <CalendarDays className='w-3.5 h-3.5' />
                    </div>
                    <h4 className='text-xs font-bold text-slate-800 uppercase tracking-widest'>
                      Schedule
                    </h4>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <Input
                      control={control}
                      fieldName='date'
                      Label='Start Date'
                      isDate
                      formatDisplay={(val) =>
                        val ? format(new Date(val), "yyyy-MM-dd") : ""
                      }
                    />

                    <Input
                      control={control}
                      fieldName='end_date'
                      Label='End Date'
                      isDate
                      formatDisplay={(val) =>
                        val ? format(new Date(val), "yyyy-MM-dd") : ""
                      }
                    />
                  </div>
                </div>

                {siteChoice === "existing" ? (
                  <div className='bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4'>
                    <div className='flex items-center justify-between gap-4'>
                      <h4 className='text-sm font-semibold text-slate-700 flex items-center gap-2'>
                        <Building2 className='w-4 h-4 text-primary' />
                        Select Site Location
                      </h4>
                      <div className='relative w-full max-w-xs'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                        <input
                          type='text'
                          placeholder='Search existing sites...'
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                          }}
                          className='w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all'
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-1 gap-2 min-h-[200px]'>
                      {isLoadingSites && allSites.length === 0 ? (
                        <div className='flex items-center justify-center p-8'>
                          <Loader2 className='w-6 h-6 animate-spin text-primary/40' />
                        </div>
                      ) : allSites.length > 0 ? (
                        allSites.map((site) => {
                          const isSelected = selectedSiteId === site.id;
                          return (
                            <div
                              key={site.id}
                              onClick={() => setValue("site_id", site.id)}
                              className={`p-3 rounded-lg h-16 border-2 cursor-pointer transition-all flex items-center justify-between ${
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
                              }`}>
                              <div className='flex flex-col'>
                                <span
                                  className={`text-sm font-medium ${isSelected ? "text-primary" : "text-slate-700"}`}>
                                  {capitalFirstLetter(site.name)}
                                </span>
                                <span className='text-xs text-slate-500 truncate'>
                                  {site.address}, {site.city}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className='w-4 h-4 text-primary' />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className='flex flex-col items-center justify-center p-8 text-slate-400'>
                          <Building2 className='w-8 h-8 mb-2 opacity-20' />
                          <p className='text-sm italic'>
                            No sites found matching your search.
                          </p>
                        </div>
                      )}
                    </div>

                    {sitesData && (sitesData.totalCount ?? 0) > 0 && (
                      <div className='flex flex-col gap-2 pt-2 border-t border-slate-100'>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs text-slate-500'>
                            Showing {allSites.length} of {sitesData.totalCount}{" "}
                            sites
                          </span>
                          {sitesData.hasMore && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              disabled={isFetchingSites}
                              onClick={() => setCurrentPage((p) => p + 1)}
                              className='h-8 text-primary hover:text-primary hover:bg-primary/5 text-xs font-bold gap-2'>
                              {isFetchingSites ? (
                                <Loader2 className='w-3 h-3 animate-spin' />
                              ) : (
                                <Plus className='w-3 h-3' />
                              )}
                              Load More
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {errors.site_id && (
                      <p className='text-[0.8rem] font-medium text-destructive'>
                        Please select a site to proceed.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className='bg-emerald-50 border mt-6 border-emerald-100 rounded-xl p-6 space-y-6'>
                    <div className='flex items-center gap-3 border-b border-emerald-100 pb-4'>
                      <div className='p-2 bg-emerald-100 rounded-lg'>
                        <Plus className='w-5 h-5 text-emerald-600' />
                      </div>
                      <div>
                        <h4 className='text-sm font-bold text-slate-800 uppercase tracking-wide'>
                          Create New Site Location
                        </h4>
                        <p className='text-xs text-emerald-600'>
                          Enter the coordinate details for a new site
                        </p>
                      </div>
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <div className='col-span-1 sm:col-span-2'>
                        <Input
                          control={control}
                          fieldName='new_site.name'
                          Label='Site Name *'
                          placeholder='Enter site name'
                          className='bg-white'
                        />
                      </div>

                      <div className='col-span-2'>
                        <Input
                          control={control}
                          fieldName='new_site.address'
                          Label='Address *'
                          placeholder='Enter address'
                          className='bg-white'
                        />
                      </div>

                      <Input
                        control={control}
                        fieldName='new_site.city'
                        Label='City *'
                        placeholder='City'
                        className='bg-white'
                      />

                      <Input
                        control={control}
                        fieldName='new_site.state'
                        Label='State *'
                        placeholder='State'
                        className='bg-white'
                      />

                      <Input
                        control={control}
                        fieldName='new_site.pincode'
                        Label='Pincode *'
                        placeholder='Pincode'
                        className='bg-white'
                      />
                    </div>
                  </div>
                )}

                <div className='flex justify-end items-center gap-4 pt-6 border-t border-slate-100'>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => setStep(1)}
                    className='text-slate-500'>
                    Cancel
                  </Button>
                  <CustomButton
                    variant='primary'
                    text='Submit Work Order Site'
                    loading={addSiteMutation.isPending}
                    type='submit'
                    className='px-8'
                    disableForViewer
                  />
                </div>
              </div>
            )
          )}
        </form>
      </Form>
    </DialogWindow>
  );
};

export default CreateWorkOrderSiteDialog;
