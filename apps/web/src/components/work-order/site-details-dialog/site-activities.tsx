import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { constants } from "@pkg/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FlaskConical,
  Building2,
  Receipt,
  BarChart3,
  Rows3,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import DocumentsField from "@/components/shared/documents-field";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CustomButton from "@/components/shared/btn";

type DocType = "estimate" | "completion" | "estimate_sub-wo";

const PHASES: DocType[] = ["estimate_sub-wo", "completion"];
const PHASE_LABELS: Record<string, string> = {
  estimate: "Estimate",
  completion: "Completion",
  "estimate_sub-wo": "Estimate / Sub-WO",
};

const formatName = (name: string) => {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const isBioremActivityKey = (key: string) =>
  key === "biorem_cont_soil" ||
  key === constants.WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL;

interface ActivityData {
  estimated_quantity: string;
  amount: string;
  transportation_km: string;
  oil_zapper_quantity: string;
}

const PhaseForm = ({
  woSiteId,
  phase,
  processType,
  activities,
  getActivityData,
  siteDocuments,
  oilZappingData,
}: {
  woSiteId: number;
  phase: DocType;
  processType: string | undefined;
  activities: {
    id: number;
    activity: string;
    unit: string | null;
    rate?: string | null;
    sor_estimated_quantity?: string | null;
    total_used_quantity?: string | null;
    total_completion_quantity?: string | null;
  }[];
  getActivityData: (
    activityKey: string,
    phase: DocType,
    isBioremediation: boolean,
  ) =>
    | {
        estimated_quantity: string | number;
        amount: string | number | null;
        transportation_km: string | number | null;
        oil_zapper_quantity?: string | number | null;
      }
    | undefined;
  siteDocuments:
    | {
        id: number;
        type: string;
        document_url: string;
        document_id?: string | null;
      }[]
    | undefined;
  oilZappingData?: { estimated_quantity?: string | null }[];
}) => {
  const utils = trpc.useUtils();
  const isBioremediation = processType === "bioremediation";
  // The estimate also plans how much oil zapper the bioremediation soil needs.
  const showOilZapper = isBioremediation && phase === "estimate_sub-wo";

  const totalOilZappingQty = React.useMemo(() => {
    if (!isBioremediation || !oilZappingData) return 0;
    return oilZappingData.reduce((sum, entry) => {
      return sum + (parseFloat(entry.estimated_quantity || "0") || 0);
    }, 0);
  }, [isBioremediation, oilZappingData]);

  const [formData, setFormData] = useState<Record<string, ActivityData>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const hasExistingData = React.useMemo(() => {
    return activities.some((activity) => {
      const data = getActivityData(activity.activity, phase, isBioremediation);
      return data && data.estimated_quantity != null && data.estimated_quantity !== "";
    });
  }, [activities, phase, getActivityData, isBioremediation]);

  const isReadOnly = hasExistingData && !isEditMode;

  const expenseSummaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: phase === "completion" && woSiteId > 0 },
  );

  const expensesByActivity = React.useMemo(
    () => expenseSummaryQuery.data?.byActivity ?? {},
    [expenseSummaryQuery.data?.byActivity],
  );

  // Files waiting to upload, keyed by document type (estimate, ...).
  const [pendingDocs, setPendingDocs] = useState<Record<string, File[]>>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const {
    uploadFiles,
    isUploading: isFileUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/${phase}`,
    // Never overwrite an earlier upload that has the same file name.
    conflictBehavior: "rename",
  });

  const deleteDocumentMutation =
    trpc.workOrderSiteMutation.deleteSiteDocument.useMutation({
      onSuccess: () => {
        toast.success("Document deleted");
        utils.workOrderSiteQuery.getSiteDocuments.invalidate();
      },
      onError: (err: any) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to delete the document. Please try again.";
        toast.error(`Failed to delete document: ${message}`);
      },
    });

  const createSiteDocMutation =
    trpc.workOrderSiteMutation.createSiteDocument.useMutation();

  useEffect(() => {
    const newFormData: Record<string, ActivityData> = {};
    activities.forEach((activity) => {
      const isBioremActivity =
        activity.activity === "biorem_cont_soil" ||
        activity.activity ===
          constants.WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL;

      if (
        isBioremediation &&
        phase === "completion" &&
        isBioremActivity &&
        totalOilZappingQty > 0
      ) {
        const rate = parseFloat(activity.rate || "0");
        const autoAmount = (totalOilZappingQty * rate).toFixed(2);
        newFormData[activity.activity] = {
          estimated_quantity: totalOilZappingQty.toFixed(2),
          amount: autoAmount,
          transportation_km: "",
          oil_zapper_quantity: "",
        };
        return;
      }

      const data = getActivityData(activity.activity, phase, isBioremediation);
      if (data) {
        newFormData[activity.activity] = {
          estimated_quantity: data.estimated_quantity?.toString() || "",
          amount: data.amount?.toString() || "",
          transportation_km: data.transportation_km?.toString() || "",
          oil_zapper_quantity: data.oil_zapper_quantity?.toString() || "",
        };
      } else {
        newFormData[activity.activity] = {
          estimated_quantity: "",
          amount: "",
          transportation_km: "",
          oil_zapper_quantity: "",
        };
      }
    });
    setFormData(newFormData);
  }, [
    activities,
    phase,
    getActivityData,
    isBioremediation,
    totalOilZappingQty,
  ]);

  const handleChange = (
    activityKey: string,
    field: keyof ActivityData,
    value: string,
  ) => {
    setFormData((prev) => {
      const updatedActivity = {
        ...prev[activityKey],
        [field]: value,
      } as ActivityData;

      if (field === "estimated_quantity") {
        const activity = activities.find((a) => a.activity === activityKey);
        const rate = parseFloat(activity?.rate || "0");
        const qty = parseFloat(value) || 0;

        updatedActivity.amount = (qty * rate).toFixed(2);
      }

      return {
        ...prev,
        [activityKey]: updatedActivity,
      };
    });
  };

  const saveContaminatedSoil =
    trpc.workOrderSiteMutation.saveContaminatedSoil.useMutation({
      onSuccess: () => {
        toast.success("Bioremediation data saved.");
        utils.workOrderSiteQuery.getBioremediationData.invalidate();
        utils.workOrderSiteQuery.getSiteActivities.invalidate({
          work_order_site_id: woSiteId,
        });
        utils.workOrderSiteQuery.getSiteDocuments.invalidate();
        utils.expenseQuery.getExpenseSummary.invalidate({
          work_order_site_id: woSiteId,
        });
        utils.expenseQuery.getExpenses.invalidate({
          work_order_site_id: woSiteId,
        });
        setPendingDocs({});
        resetUpload();
        setIsEditMode(false);
      },
      onError: (err: any) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to save the data. Please try again.";
        toast.error(`Failed to save: ${message}`);
      },
    });

  const handleSaveAll = async () => {
    const missingFieldActivities: string[] = [];
    activities.forEach((activity) => {
      const data = formData[activity.activity];
      if (!data || !data.estimated_quantity?.trim()) {
        missingFieldActivities.push(formatName(activity.activity));
      }
    });

    if (missingFieldActivities.length > 0) {
      toast.error(
        `Please fill in the Estimated Quantity for: ${missingFieldActivities.join(", ")}`,
      );
      return;
    }

    if (
      showOilZapper &&
      activities.some(
        (activity) =>
          isBioremActivityKey(activity.activity) &&
          !formData[activity.activity]?.oil_zapper_quantity?.trim(),
      )
    ) {
      toast.error("Please fill in the Oil Zapper quantity.");
      return;
    }

    const exceedingQuantityActivities: string[] = [];
    activities.forEach((activity) => {
      const data = formData[activity.activity];
      if (data && activity.sor_estimated_quantity) {
        const enteringQty = parseFloat(data.estimated_quantity) || 0;
        const sorQty = parseFloat(activity.sor_estimated_quantity) || 0;
        const totalCompletionUsed = parseFloat(
          activity.total_completion_quantity || "0",
        );
        const prevSaved = parseFloat(
          getActivityData(
            activity.activity,
            "completion",
            isBioremediation,
          )?.estimated_quantity?.toString() || "0",
        );
        const availableForThisSite = sorQty - (totalCompletionUsed - prevSaved);

        if (
          phase === "completion" &&
          enteringQty > availableForThisSite + 0.001
        ) {
          exceedingQuantityActivities.push(
            `${formatName(activity.activity)} (Available: ${availableForThisSite.toFixed(2)})`,
          );
        }
      }
    });

    if (exceedingQuantityActivities.length > 0) {
      toast.error(
        `Quantity cannot exceed the SOR limit: ${exceedingQuantityActivities.join(", ")}`,
      );
      return;
    }

    const documentCount = (type: string) =>
      (siteDocuments?.filter((d) => d.type === type).length ?? 0) +
      (pendingDocs[type]?.length ?? 0);

    if (phase === "estimate_sub-wo") {
      if (documentCount("estimate") === 0) {
        toast.error("Please upload the Estimate document.");
        return;
      }
    } else if (phase === "completion") {
      // The certificate is uploaded from the site information card.
      if (documentCount("completion_certificate") === 0) {
        toast.error(
          "Upload the completion certificate in Site Information first.",
        );
        return;
      }
    } else if (documentCount(phase) === 0) {
      toast.error(`Please upload the ${PHASE_LABELS[phase]} document.`);
      return;
    }

    // Each uploaded file is saved as its own site document of that type.
    for (const [type, files] of Object.entries(pendingDocs)) {
      if (files.length === 0) continue;

      setUploadingType(type);
      const uploaded = await uploadFiles(files);
      setUploadingType(null);
      if (!uploaded) return;

      for (const doc of uploaded) {
        await createSiteDocMutation.mutateAsync({
          work_order_site_id: woSiteId,
          type,
          document_url: doc.webUrl,
          document_id: doc.id,
        });
      }
    }

    const commonData = {
      work_order_site_id: woSiteId,
      phase,
    };

    if (isBioremediation) {
      const bioremActivity = activities.find(
        (a) =>
          a.activity === "biorem_cont_soil" ||
          a.activity ===
            constants.WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL,
      );
      if (bioremActivity) {
        const data = formData[bioremActivity.activity];
        if (data) {
          saveContaminatedSoil.mutate({
            ...(commonData as any),
            data: {
              estimated_quantity: data.estimated_quantity,
              amount: data.amount || undefined,
              transportation_km: data.transportation_km || undefined,
              oil_zapper_quantity: showOilZapper
                ? data.oil_zapper_quantity || undefined
                : undefined,
            },
          });
        }
      }
    }
  };

  const isLoading = saveContaminatedSoil.isPending || isFileUploading;

  const renderDocumentSection = (type: string) => {
    const savedDocs = siteDocuments?.filter((d) => d.type === type) ?? [];
    const label = PHASE_LABELS[type as DocType] || type;

    return (
      <DocumentsField
        label={`Upload ${label} Documents`}
        files={pendingDocs[type] ?? []}
        onFilesChange={(files) =>
          setPendingDocs((prev) => ({ ...prev, [type]: files }))
        }
        existing={savedDocs.map((doc, index) => ({
          url: doc.document_url,
          id: doc.document_id ?? null,
          name: `${label} document ${index + 1}`,
        }))}
        onRemoveExisting={(index) => {
          const doc = savedDocs[index];
          if (doc && confirm("Delete this document?")) {
            deleteDocumentMutation.mutate({ id: doc.id });
          }
        }}
        isUploading={uploadingType === type}
        progress={progress}
        className='rounded-xl'
      />
    );
  };

  return (
    <div className='space-y-5'>
      {phase !== "completion" && (
        <div className='rounded-xl border border-slate-200 bg-gray-100/50 p-4'>
          <div className='mb-3'>
            <h4 className='text-[11px] font-semibold text-slate-600 uppercase tracking-wider'>
              Required Documents
            </h4>
          </div>

          {phase === "estimate_sub-wo" ? (
            <div className='space-y-1.5'>
              <span className='text-[10px] font-medium text-slate-500 uppercase tracking-wider px-0.5'>
                Estimate
              </span>
              {renderDocumentSection("estimate")}
            </div>
          ) : (
            renderDocumentSection(phase)
          )}
        </div>
      )}

          <div className='rounded-xl border bg-gray-100/50 overflow-hidden'>
            <div className='overflow-x-auto'>
            <Table className='w-full text-xs'>
              <TableHeader>
                <TableRow className='border-b'>
                  <TableHead className='px-4 py-3 text-left w-[30%] text-slate-500 font-semibold h-auto text-[10px] uppercase tracking-wider'>
                    Activity Name
                  </TableHead>
                  <TableHead className='px-2 py-3 text-center w-[10%] text-slate-500 font-semibold h-auto text-[10px] uppercase tracking-wider'>
                    Unit
                  </TableHead>
                  <TableHead className='px-2 py-3 text-center w-[15%] text-slate-500 font-semibold h-auto text-[10px] uppercase tracking-wider'>
                    Rate
                  </TableHead>
                  <TableHead className='px-2 py-3 text-center w-[15%] text-slate-500 font-semibold h-auto text-[10px] uppercase tracking-wider'>
                    Est. Qty
                  </TableHead>
                  {showOilZapper && (
                    <TableHead className='px-2 py-3 text-center w-[15%] text-slate-500 font-semibold h-auto text-[10px] uppercase tracking-wider'>
                      {constants.OIL_ZAPPER.LABEL} ({constants.OIL_ZAPPER.UNIT})
                    </TableHead>
                  )}
                  <TableHead className='px-2 py-3 text-center w-[15%] text-slate-500 font-semibold h-auto text-[10px] uppercase tracking-wider'>
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='divide-y'>
                {activities.map((activity) => {
                  const currentData = formData[activity.activity] || {
                    estimated_quantity: "",
                    amount: "",
                    transportation_km: "",
                    oil_zapper_quantity: "",
                  };

                  const isBioremActivity =
                    isBioremediation &&
                    (activity.activity === "biorem_cont_soil" ||
                      activity.activity ===
                        constants.WO_ACTIVITIES
                          .BIOREMEDIATION_OIL_CONTAMINATED_SOIL);

                  const isAutoFilledFromZapping =
                    isBioremActivity &&
                    phase === "completion" &&
                    totalOilZappingQty > 0;

                  const expenseSummary =
                    phase === "completion"
                      ? expensesByActivity[activity.activity]
                      : undefined;

                  // Bioremediation is measured against its estimate.
                  const estimateQty = isBioremActivity
                    ? parseFloat(
                        getActivityData(
                          activity.activity,
                          "estimate_sub-wo",
                          isBioremediation,
                        )?.estimated_quantity?.toString() || "0",
                      )
                    : 0;
                  const exceededQty =
                    isAutoFilledFromZapping && estimateQty > 0
                      ? totalOilZappingQty - estimateQty
                      : 0;
                  const expenseColSpan = showOilZapper ? 6 : 5;

                  return (
                    <React.Fragment key={activity.id}>
                    <TableRow
                      className='group hover:bg-blue-50/20 transition-colors'>
                      <TableCell className='px-4 py-2.5 font-medium text-slate-700 text-xs'>
                        {formatName(activity.activity)}
                      </TableCell>
                      <TableCell className='px-2 py-2.5 text-center'>
                        <span className='text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full'>
                          {activity.unit || "Nos"}
                        </span>
                      </TableCell>
                      <TableCell className='px-2 py-2.5 text-center text-emerald-600 font-semibold'>
                        ₹{activity.rate || "0.00"}
                      </TableCell>
                      <TableCell className='p-0'>
                        <Input
                          value={currentData.estimated_quantity}
                          onChange={(e) =>
                            handleChange(
                              activity.activity,
                              "estimated_quantity",
                              e.target.value,
                            )
                          }
                          readOnly={isAutoFilledFromZapping || isReadOnly}
                          className={`h-10 w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-center text-xs placeholder:text-slate-300 ${
                            isAutoFilledFromZapping
                              ? "bg-blue-50/60 text-blue-700 font-semibold cursor-default"
                              : isReadOnly
                                ? "bg-slate-50/60 text-slate-600 cursor-default"
                                : "bg-transparent"
                          }`}
                          placeholder={
                            activity.sor_estimated_quantity
                              ? `Max: ${activity.sor_estimated_quantity}`
                              : "0.00"
                          }
                        />
                        {isAutoFilledFromZapping && (
                          <div className='px-2 py-1.5 flex flex-col gap-1 text-xs border-t border-blue-100 bg-blue-50/40'>
                            <div className='flex justify-between text-blue-600'>
                              <span className='opacity-70'>
                                Oil Zapping Total:
                              </span>
                              <span className='font-medium'>
                                {totalOilZappingQty.toFixed(2)}
                              </span>
                            </div>
                            {estimateQty > 0 && (
                              <div className='flex justify-between text-slate-500'>
                                <span className='opacity-70'>
                                  Estimate Qty:
                                </span>
                                <span className='font-medium'>
                                  {estimateQty.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {exceededQty > 0 && (
                              <div className='flex justify-between border-t border-red-200/60 pt-1 mt-0.5'>
                                <span className='font-semibold text-red-600'>
                                  Exceeded:
                                </span>
                                <span className='text-red-600 font-bold'>
                                  +{exceededQty.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      {showOilZapper && (
                        <TableCell className='p-0'>
                          {isBioremActivity ? (
                            <Input
                              inputMode='decimal'
                              value={currentData.oil_zapper_quantity}
                              onChange={(e) =>
                                handleChange(
                                  activity.activity,
                                  "oil_zapper_quantity",
                                  e.target.value,
                                )
                              }
                              readOnly={isReadOnly}
                              className={`h-10 w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-center text-xs placeholder:text-slate-300 ${
                                isReadOnly
                                  ? "bg-slate-50/60 text-slate-600 cursor-default"
                                  : "bg-transparent"
                              }`}
                              placeholder='0.00'
                            />
                          ) : (
                            <span className='block text-center text-slate-300'>
                              —
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className='p-0'>
                        <Input
                          value={currentData.amount}
                          readOnly
                          className='h-10 w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-slate-50/30 px-3 text-center text-xs font-semibold text-slate-700 placeholder:text-slate-300'
                          placeholder='0.00'
                        />
                      </TableCell>
                    </TableRow>
                    {expenseSummary && expenseSummary.count > 0 && (
                      <TableRow className='bg-slate-50/60 hover:bg-slate-50/60'>
                        <TableCell
                          colSpan={expenseColSpan}
                          className='px-4 py-1.5'>
                          <div className='flex items-center gap-4 text-[10px] text-slate-500'>
                            <span>
                              Expenses logged:{" "}
                              <span className='font-semibold text-slate-700'>
                                {expenseSummary.count}
                              </span>
                            </span>
                            <span>
                              Spent:{" "}
                              <span className='font-semibold text-slate-700'>
                                ₹{expenseSummary.totalAmount.toFixed(2)}
                              </span>
                            </span>
                            {expenseSummary.exceededAmount > 0 && (
                              <span className='ml-auto flex items-center gap-1 font-semibold text-orange-600'>
                                <AlertTriangle className='w-3 h-3' />
                                Exceeded: ₹
                                {expenseSummary.exceededAmount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>

      <div className='flex justify-end gap-2 pt-1'>
        {isReadOnly ? (
          <CustomButton
            variant='outline'
            text='Edit'
            Icon={Pencil}
            onClick={() => setIsEditMode(true)}
            type='button'
            disableForViewer
          />
        ) : (
          <>
            {hasExistingData && (
              <CustomButton
                variant='outline'
                text='Cancel'
                onClick={() => setIsEditMode(false)}
                type='button'
              />
            )}
            <CustomButton
              variant='primary'
              text={`Save ${PHASE_LABELS[phase]} Data`}
              onClick={handleSaveAll}
              type='button'
              loading={isLoading}
              disabled={isLoading}
              disableForViewer
            />
          </>
        )}
      </div>
    </div>
  );
};

const SiteActivities = ({
  woSiteId,
  processType,
  phase,
  showPhaseTabs = true,
}: {
  woSiteId: number;
  processType: string | undefined;
  phase?: (typeof PHASES)[number];
  showPhaseTabs?: boolean;
}) => {
  const siteActivitiesQuery =
    trpc.workOrderSiteQuery.getSiteActivities.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: !!woSiteId },
    );

  const bioremediationDataQuery =
    trpc.workOrderSiteQuery.getBioremediationData.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: !!woSiteId },
    );

  const siteDocumentsQuery = trpc.workOrderSiteQuery.getSiteDocuments.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId },
  );

  const getActivityData = useCallback(
    (activityKey: string, phase: DocType, isBioremediation: boolean) => {
      const data = bioremediationDataQuery.data;
      if (!isBioremediation || !data) return undefined;
      if (
        activityKey === "biorem_cont_soil" ||
        activityKey ===
          constants.WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL
      ) {
        const activityType =
          phase === "completion" ? "completion" : "estimate_sub-wo";
        return data.contaminatedSoil.find(
          (item: any) => item.type === activityType,
        );
      }
      return undefined;
    },
    [bioremediationDataQuery.data],
  );

  return (
    <div className='space-y-5'>
      <div className='rounded-xl bg-white overflow-hidden'>
        <div className='py-4 border-b border-slate-200'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div>
                <h3 className='text-sm font-bold text-gray-800'>
                  Bioremediation Data
                </h3>
                <p className='text-[10px] text-slate-400'>
                  {showPhaseTabs
                    ? "Enter estimate and completion data for activities"
                    : `Enter ${PHASE_LABELS[phase ?? "estimate_sub-wo"]} data for activities`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {showPhaseTabs ? (
          <Tabs
            defaultValue='estimate_sub-wo'
            className='w-full'>
            <div className=' pt-3'>
              <TabsList className='grid w-full max-w-xs grid-cols-2 bg-slate-100 p-1 rounded-lg h-9'>
                {PHASES.map((phase) => (
                  <TabsTrigger
                    key={phase}
                    value={phase}
                    className='text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:font-semibold rounded-md transition-all'>
                    {PHASE_LABELS[phase]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {PHASES.map((phase) => (
              <TabsContent
                key={phase}
                value={phase}
                className='py-5 pt-4'>
                {siteActivitiesQuery.data &&
                siteActivitiesQuery.data.length > 0 ? (
                  <PhaseForm
                    woSiteId={woSiteId}
                    phase={phase}
                    processType={processType}
                    activities={siteActivitiesQuery.data}
                    getActivityData={getActivityData}
                    siteDocuments={siteDocumentsQuery.data}
                    oilZappingData={bioremediationDataQuery.data?.oilZapping}
                  />
                ) : (
                  <div className='text-xs text-center text-slate-400 italic py-10 border-2 border-dashed border-slate-200 rounded-xl'>
                    No activities found for this site.
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className='py-5 pt-4'>
            {siteActivitiesQuery.data && siteActivitiesQuery.data.length > 0 ? (
              <PhaseForm
                woSiteId={woSiteId}
                phase={phase ?? "estimate_sub-wo"}
                processType={processType}
                activities={siteActivitiesQuery.data}
                getActivityData={getActivityData}
                siteDocuments={siteDocumentsQuery.data}
                oilZappingData={bioremediationDataQuery.data?.oilZapping}
              />
            ) : (
              <div className='text-xs text-center text-slate-400 italic py-10 border-2 border-dashed border-slate-200 rounded-xl'>
                No activities found for this site.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteActivities;
