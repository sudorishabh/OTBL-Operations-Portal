import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { constants } from "@pkg/utils";
import { BioremediationSections } from "./bioremediation-sections";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FlaskConical,
  Building2,
  Trash2,
  ExternalLink,
  CheckCircle,
  FileText,
  X,
  Receipt,
  BarChart3,
  Rows3,
  ReceiptIndianRupee,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import DeferredFilePicker from "@/components/shared/deferred-file-picker";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

type DocType =
  | "sub_wo"
  | "estimate"
  | "completion"
  | "estimate_sub-wo"
  | "bills"
  | "completion_certificate";

const PHASES: DocType[] = ["estimate_sub-wo", "completion"];
const PHASE_LABELS: Record<string, string> = {
  sub_wo: "Sub WO",
  estimate: "Estimate",
  completion: "Completion",
  "estimate_sub-wo": "Estimate / Sub-WO",
  bills: "Bills",
  completion_certificate: "Completion Certificate",
};

const formatName = (name: string) => {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

interface ActivityData {
  estimated_quantity: string;
  amount: string;
  transportation_km: string;
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
      }
    | undefined;
  siteDocuments:
    | { id: number; type: string; document_url: string }[]
    | undefined;
  oilZappingData?: { estimated_quantity?: string | null }[];
}) => {
  const utils = trpc.useUtils();
  const isBioremediation = processType === "bioremediation";

  // Compute total oil zapping quantity for bioremediation completion auto-fill
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

  // Per-activity expense aggregation for the Completion tab (spent + exceeded).
  const expenseSummaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: phase === "completion" && woSiteId > 0 },
  );

  const expensesByActivity = React.useMemo(
    () => expenseSummaryQuery.data?.byActivity ?? {},
    [expenseSummaryQuery.data?.byActivity],
  );

  const [file, setFile] = useState<File | null>(null);
  const [subWoFile, setSubWoFile] = useState<File | null>(null);
  const [estimateFile, setEstimateFile] = useState<File | null>(null);
  const [completionCertFile, setCompletionCertFile] = useState<File | null>(
    null,
  );
  const [billFiles, setBillFiles] = useState<File[]>([]);

  const {
    uploadFile,
    isUploading: isFileUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/${phase}`,
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

      // For bioremediation completion phase, auto-fill from oil zapping total
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
        };
        return;
      }

      // For non-bioremediation completion phase, qty is derived from the
      // sum of expense quantities for that activity; amount uses the SOR rate.
      const expenseTotal =
        phase === "completion"
          ? (expensesByActivity[activity.activity]?.totalQuantity ?? 0)
          : 0;
      if (!isBioremediation && phase === "completion" && expenseTotal > 0) {
        const rate = parseFloat(activity.rate || "0");
        const autoAmount = (expenseTotal * rate).toFixed(2);
        const saved = getActivityData(
          activity.activity,
          phase,
          isBioremediation,
        );
        newFormData[activity.activity] = {
          estimated_quantity: expenseTotal.toFixed(2),
          amount: autoAmount,
          transportation_km: saved?.transportation_km?.toString() || "",
        };
        return;
      }

      const data = getActivityData(activity.activity, phase, isBioremediation);
      if (data) {
        newFormData[activity.activity] = {
          estimated_quantity: data.estimated_quantity?.toString() || "",
          amount: data.amount?.toString() || "",
          transportation_km: data.transportation_km?.toString() || "",
        };
      } else {
        newFormData[activity.activity] = {
          estimated_quantity: "",
          amount: "",
          transportation_km: "",
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
    expensesByActivity,
  ]);

  const handleChange = (
    activityKey: string,
    field: keyof ActivityData,
    value: string,
  ) => {
    setFormData((prev) => {
      // Cast is safe: all fields come from an existing ActivityData plus one string
      // override. TypeScript widens computed-key spreads to optional, so we assert.
      const updatedActivity = {
        ...prev[activityKey],
        [field]: value,
      } as ActivityData;

      // Automatic Calculation of amount if quantity is entered
      if (field === "estimated_quantity") {
        const activity = activities.find((a) => a.activity === activityKey);
        const rate = parseFloat(activity?.rate || "0");
        const qty = parseFloat(value) || 0;

        // Update amount even if rate is 0 to clear it if needed
        updatedActivity.amount = (qty * rate).toFixed(2);
      }

      return {
        ...prev,
        [activityKey]: updatedActivity,
      };
    });
  };

  const saveRestoration =
    trpc.workOrderSiteMutation.saveRestorationPhase.useMutation({
      onSuccess: () => {
        toast.success("All phase activities saved successfully.");
        utils.workOrderSiteQuery.getRestorationData.invalidate();
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
        setFile(null);
        setSubWoFile(null);
        setEstimateFile(null);
        setCompletionCertFile(null);
        setBillFiles([]);
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
        setFile(null);
        setSubWoFile(null);
        setEstimateFile(null);
        setCompletionCertFile(null);
        setBillFiles([]);
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
    // --- Validation: Check all activity fields are filled ---
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

    // --- Validation: Check quantity against SOR (based on completion quantities) ---
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

        // Only enforce SOR limit on completion phase
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

    // --- Validation: Check documents ---
    let subWoDocUrl = siteDocuments?.find(
      (d) => d.type === "sub_wo",
    )?.document_url;
    let estimateDocUrl = siteDocuments?.find(
      (d) => d.type === "estimate",
    )?.document_url;
    let docUrl = siteDocuments?.find((d) => d.type === phase)?.document_url;
    let completionCertUrl = siteDocuments?.find(
      (d) => d.type === "completion_certificate",
    )?.document_url;

    if (phase === "estimate_sub-wo") {
      if ((!subWoDocUrl && !subWoFile) || (!estimateDocUrl && !estimateFile)) {
        toast.error("Please upload both Sub WO and Estimate documents.");
        return;
      }
    } else if (phase === "completion") {
      if (!completionCertUrl && !completionCertFile) {
        toast.error("Please upload Completion Certificate.");
        return;
      }
    } else {
      if (!docUrl && !file) {
        toast.error(`Please upload the ${PHASE_LABELS[phase]} document.`);
        return;
      }
    }

    // --- Upload files ---
    if (phase === "estimate_sub-wo") {
      if (subWoFile) {
        const result = await uploadFile(subWoFile);
        if (result) subWoDocUrl = result.webUrl;
        else return;
      }
      if (estimateFile) {
        const result = await uploadFile(estimateFile);
        if (result) estimateDocUrl = result.webUrl;
        else return;
      }
    } else if (phase === "completion") {
      if (completionCertFile) {
        const result = await uploadFile(completionCertFile);
        if (result) completionCertUrl = result.webUrl;
        else return;
      }
      // Upload bills
      for (const billFile of billFiles) {
        const result = await uploadFile(billFile);
        if (result) {
          await createSiteDocMutation.mutateAsync({
            work_order_site_id: woSiteId,
            type: "bills",
            document_url: result.webUrl,
          });
        }
      }
    } else if (file) {
      const result = await uploadFile(file);
      if (result) docUrl = result.webUrl;
      else return;
    }

    if (completionCertFile && completionCertUrl) {
      await createSiteDocMutation.mutateAsync({
        work_order_site_id: woSiteId,
        type: "completion_certificate",
        document_url: completionCertUrl,
      });
    }

    // --- Prepare Payload ---
    const commonData = {
      work_order_site_id: woSiteId,
      phase,
      document_url: docUrl,
      sub_wo_document_url: subWoDocUrl,
      estimate_document_url: estimateDocUrl,
    };

    // --- Save data ---
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
            },
          });
        }
      }
    } else {
      const payload: any = {
        ...commonData,
        phase: phase as any,
      };

      activities.forEach((activity) => {
        const data = formData[activity.activity];
        if (!data) return;

        let fieldName = "";
        switch (activity.activity) {
          case "clean_up_oil_spill":
          case "clean_soil_area":
          case constants.WO_ACTIVITIES.clean_soil_area:
            fieldName = "clean_soil_area";
            break;
          case "lifting_oil_slush":
          case constants.WO_ACTIVITIES.LIFTING_OILY_SLUSH_OR_RECOVERY_OF_OIL:
            fieldName = "lifting_oil_slush";
            break;
          case "excav_cont_soil":
          case constants.WO_ACTIVITIES.EXCAVATION_OIL_CONTAMINATED_SOIL:
            fieldName = "excav_cont_soil";
            break;
          case "trans_cont_soil":
          case "trnsprt_oil_slush":
          case constants.WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL:
            fieldName = "trans_cont_soil";
            break;
          case "refill_excav_soil":
          case constants.WO_ACTIVITIES
            .REFILLING_EXCAVATED_OIL_CONTAMINATED_SOIL_LAND:
            fieldName = "refill_excav_soil";
            break;
        }

        if (fieldName) {
          payload[fieldName] = {
            estimated_quantity: data.estimated_quantity,
            amount: data.amount || undefined,
            transportation_km: data.transportation_km || undefined,
          };
        }
      });

      saveRestoration.mutate(payload);
    }
  };

  const isLoading =
    saveRestoration.isPending ||
    saveContaminatedSoil.isPending ||
    isFileUploading;

  const renderDocumentSection = (
    type: string,
    currentFile: File | null,
    setFileFn: (f: File | null) => void,
  ) => {
    const existing = siteDocuments?.find((d) => d.type === type);
    const label = PHASE_LABELS[type as DocType] || type;

    if (existing && !currentFile) {
      return (
        <div className='group relative flex items-center gap-3 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/70 transition-all hover:border-emerald-300 hover:shadow-sm'>
          <div className='flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 shrink-0'>
            <CheckCircle className='size-4' />
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-[11px] font-semibold text-emerald-800 leading-tight'>
              {label} Document
            </p>
            <a
              href={existing.document_url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-0.5 transition-colors'>
              View uploaded file
              <ExternalLink className='size-3' />
            </a>
          </div>
          <Button
            size='sm'
            variant='ghost'
            onClick={() =>
              confirm("Delete this document?") &&
              deleteDocumentMutation.mutate({ id: existing.id })
            }
            className='h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all'>
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      );
    }
    return (
      <DeferredFilePicker
        label={`Upload ${label} Document`}
        selectedFile={currentFile}
        onFileSelect={setFileFn}
        isUploading={isFileUploading}
        uploadProgress={progress}
        className='bg-white rounded-xl'
      />
    );
  };

  return (
    <div className='space-y-5'>
      {/* === Documents Section === */}
      <div className='rounded-xl border border-slate-200 bg-gray-100/50 p-4'>
        <div className='mb-3'>
          <h4 className='text-[11px] font-semibold text-slate-600 uppercase tracking-wider'>
            Required Documents
          </h4>
        </div>

        {phase === "estimate_sub-wo" ? (
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <span className='text-[10px] font-medium text-slate-500 uppercase tracking-wider px-0.5'>
                Sub WO
              </span>
              {renderDocumentSection("sub_wo", subWoFile, setSubWoFile)}
            </div>
            <div className='space-y-1.5'>
              <span className='text-[10px] font-medium text-slate-500 uppercase tracking-wider px-0.5'>
                Estimate
              </span>
              {renderDocumentSection("estimate", estimateFile, setEstimateFile)}
            </div>
          </div>
        ) : phase === "completion" ? (
          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <span className='text-[10px] font-medium text-slate-500 uppercase tracking-wider px-0.5'>
                Completion Certificate
              </span>
              {renderDocumentSection(
                "completion_certificate",
                completionCertFile,
                setCompletionCertFile,
              )}
            </div>

            {/* Bills Sub-section */}
            <div className='rounded-xl border border-slate-200/80 bg-slate-50/50 p-3'>
              <div className='flex items-center justify-between mb-2.5'>
                <div className='flex items-center gap-2'>
                  <ReceiptIndianRupee className='size-3.5 text-slate-400' />
                  <h4 className='text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                    Bills
                  </h4>
                  {(siteDocuments?.filter((d) => d.type === "bills").length ||
                    0) > 0 && (
                    <span className='text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full'>
                      {siteDocuments?.filter((d) => d.type === "bills").length}
                    </span>
                  )}
                </div>
              </div>

              {/* Existing Bills */}
              {(siteDocuments?.filter((d) => d.type === "bills").length || 0) >
                0 && (
                <div className='grid grid-cols-2 gap-2 mb-3'>
                  {siteDocuments
                    ?.filter((d) => d.type === "bills")
                    .map((doc, index) => (
                      <div
                        key={doc.id}
                        className='group flex items-center gap-2.5 bg-white p-2 rounded-lg border border-slate-200/70 hover:border-slate-300 transition-all'>
                        <div className='flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-500 text-[10px] font-bold shrink-0'>
                          {index + 1}
                        </div>
                        <a
                          href={doc.document_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-[11px] font-medium text-gray-600 truncate hover:text-blue-600 flex items-center gap-1 transition-colors flex-1 min-w-0'>
                          Bill Document {index + 1}
                          <ExternalLink className='size-3 shrink-0 opacity-50' />
                        </a>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() =>
                            confirm("Delete this bill?") &&
                            deleteDocumentMutation.mutate({ id: doc.id })
                          }
                          className='h-6 w-6 p-0 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0'>
                          <Trash2 className='size-3' />
                        </Button>
                      </div>
                    ))}
                </div>
              )}

              {/* Upload New Bill */}
              <DeferredFilePicker
                label='Add New Bill'
                onFileSelect={(f) => f && setBillFiles((prev) => [...prev, f])}
                selectedFile={null}
                isUploading={isFileUploading}
                uploadProgress={progress}
                className='bg-white h-9 rounded-lg'
              />

              {/* Pending Bill Files */}
              {billFiles.length > 0 && (
                <div className='mt-2 space-y-1.5'>
                  <span className='text-[9px] font-semibold text-amber-600 uppercase tracking-wider'>
                    Pending Upload ({billFiles.length})
                  </span>
                  {billFiles.map((f, i) => (
                    <div
                      key={i}
                      className='flex items-center justify-between bg-amber-50/60 px-2.5 py-1.5 rounded-lg border border-amber-200/60'>
                      <div className='flex items-center gap-2 min-w-0'>
                        <div className='w-5 h-5 rounded bg-amber-100 flex items-center justify-center'>
                          <FileText className='size-3 text-amber-600' />
                        </div>
                        <span className='text-[10px] text-slate-600 truncate'>
                          {f.name}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setBillFiles((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className='text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors shrink-0'>
                        <X className='size-3' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          renderDocumentSection(phase, file, setFile)
        )}
      </div>

      {/* === Activity Data Table === */}
      {(() => {
        const hasTransportActivity = activities.some(
          (a) => a.activity === "trans_cont_soil",
        );
        return (
          <div className='rounded-xl border bg-gray-100/50 overflow-hidden'>
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
                  <TableHead
                    className={`px-2 py-3 text-center ${hasTransportActivity ? "" : ""} w-[15%] text-slate-500 font-semibold h-auto text-[10px] uppercase tracking-wider`}>
                    Amount
                  </TableHead>
                  {hasTransportActivity && (
                    <TableHead className='px-2 py-3 text-center w-[15%] text-slate-500 font-semibold h-auto text-[10px] uppercase tracking-wider'>
                      Transport (KM)
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className='divide-y'>
                {activities.map((activity) => {
                  const currentData = formData[activity.activity] || {
                    estimated_quantity: "",
                    amount: "",
                    transportation_km: "",
                  };

                  const isTransportActivity =
                    activity.activity === "trans_cont_soil";

                  const isBioremActivity =
                    isBioremediation &&
                    (activity.activity === "biorem_cont_soil" ||
                      activity.activity ===
                        constants.WO_ACTIVITIES
                          .BIOREMEDIATION_OIL_CONTAMINATED_SOIL);

                  // Auto-fill from oil zapping on completion phase
                  const isAutoFilledFromZapping =
                    isBioremActivity &&
                    phase === "completion" &&
                    totalOilZappingQty > 0;

                  const expenseSummary =
                    phase === "completion"
                      ? expensesByActivity[activity.activity]
                      : undefined;

                  // Auto-fill from expenses on completion phase (non-bio activities)
                  const isAutoFilledFromExpenses =
                    !isBioremediation &&
                    phase === "completion" &&
                    !!expenseSummary &&
                    expenseSummary.totalQuantity > 0;

                  // Estimate-phase qty (used for the in-row breakdown).
                  const estimatePhaseData =
                    isBioremActivity || isAutoFilledFromExpenses
                      ? getActivityData(
                          activity.activity,
                          "estimate_sub-wo" as DocType,
                          isBioremediation,
                        )
                      : undefined;
                  const estimateQty = parseFloat(
                    estimatePhaseData?.estimated_quantity?.toString() || "0",
                  );
                  const exceededQty =
                    isAutoFilledFromZapping && estimateQty > 0
                      ? totalOilZappingQty - estimateQty
                      : 0;
                  const expenseQty = expenseSummary?.totalQuantity ?? 0;
                  const expenseExceededQty =
                    isAutoFilledFromExpenses && estimateQty > 0
                      ? expenseQty - estimateQty
                      : 0;

                  const expenseColSpan = hasTransportActivity ? 6 : 5;

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
                          readOnly={
                            isAutoFilledFromZapping ||
                            isAutoFilledFromExpenses ||
                            isReadOnly
                          }
                          className={`h-10 w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-center text-xs placeholder:text-slate-300 ${
                            isAutoFilledFromZapping || isAutoFilledFromExpenses
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
                        {isAutoFilledFromExpenses && (
                          <div className='px-2 py-1.5 flex flex-col gap-1 text-xs border-t border-blue-100 bg-blue-50/40'>
                            <div className='flex justify-between text-blue-600'>
                              <span className='opacity-70'>
                                From expenses:
                              </span>
                              <span className='font-medium'>
                                {expenseQty.toFixed(2)}
                              </span>
                            </div>
                            {estimateQty > 0 && (
                              <div className='flex justify-between text-slate-500'>
                                <span className='opacity-70'>
                                  Estimate qty:
                                </span>
                                <span className='font-medium'>
                                  {estimateQty.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {expenseExceededQty > 0 && (
                              <div className='flex justify-between border-t border-red-200/60 pt-1 mt-0.5'>
                                <span className='font-semibold text-red-600'>
                                  Exceeded:
                                </span>
                                <span className='text-red-600 font-bold'>
                                  +{expenseExceededQty.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
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
                      <TableCell className='p-0'>
                        <Input
                          value={currentData.amount}
                          readOnly
                          className='h-10 w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-slate-50/30 px-3 text-center text-xs font-semibold text-slate-700 placeholder:text-slate-300'
                          placeholder='0.00'
                        />
                      </TableCell>
                      {hasTransportActivity && (
                        <TableCell className='p-0'>
                          {isTransportActivity ? (
                            <Input
                              value={currentData.transportation_km}
                              onChange={(e) =>
                                handleChange(
                                  activity.activity,
                                  "transportation_km",
                                  e.target.value,
                                )
                              }
                              readOnly={isReadOnly}
                              className={`h-10 w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-center text-xs placeholder:text-slate-300 ${isReadOnly ? "bg-slate-50/60 text-slate-600 cursor-default" : "bg-transparent"}`}
                              placeholder='0.00'
                            />
                          ) : (
                            <div className='flex items-center justify-center h-10 text-slate-300'>
                              —
                            </div>
                          )}
                        </TableCell>
                      )}
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
        );
      })()}

      {/* === Save / Edit Button === */}
      <div className='flex justify-end gap-2 pt-1'>
        {isReadOnly ? (
          <CustomButton
            variant='outline'
            text='Edit'
            Icon={Pencil}
            onClick={() => setIsEditMode(true)}
            type='button'
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

  const restorationDataQuery =
    trpc.workOrderSiteQuery.getRestorationData.useQuery(
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
      if (isBioremediation) {
        if (!bioremediationDataQuery.data) return undefined;
        const data = bioremediationDataQuery.data;
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
      } else {
        if (!restorationDataQuery.data) return undefined;
        const data = restorationDataQuery.data;
        const activityType =
          phase === "completion" ? "completion" : "estimate_sub-wo";
        switch (activityKey) {
          case "clean_up_oil_spill":
          case "clean_soil_area":
          case constants.WO_ACTIVITIES.clean_soil_area:
            return data.cleaningUpSoilArea.find(
              (item: any) => item.type === activityType,
            );
          case "lifting_oil_slush":
          case constants.WO_ACTIVITIES.LIFTING_OILY_SLUSH_OR_RECOVERY_OF_OIL:
            return data.liftingRecoveryOilSlush.find(
              (item: any) => item.type === activityType,
            );
          case "excav_cont_soil":
          case constants.WO_ACTIVITIES.EXCAVATION_OIL_CONTAMINATED_SOIL:
            return data.excavationContSoil.find(
              (item: any) => item.type === activityType,
            );
          case "trans_cont_soil":
          case "trnsprt_oil_slush":
          case constants.WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL:
            return data.transportationContSoil.find(
              (item: any) => item.type === activityType,
            );
          case "refill_excav_soil":
          case constants.WO_ACTIVITIES
            .REFILLING_EXCAVATED_OIL_CONTAMINATED_SOIL_LAND:
            return data.refillingExcavatedContSoil.find(
              (item: any) => item.type === activityType,
            );
          default:
            return undefined;
        }
      }
    },
    [bioremediationDataQuery.data, restorationDataQuery.data],
  );

  return (
    <div className='space-y-5'>
      {/* === SOR Availability (above process section) === */}
      {siteActivitiesQuery.data?.some((a: any) => a.sor_estimated_quantity) && (
        <div className='rounded-lg border bg-gray-100/50 overflow-hidden'>
          <div className='px-3 py-1.5 border-b flex items-center gap-1.5 bg-slate-50/80'>
            <span className='text-[11px] font-semibold text-slate-600'>
              SOR availability
            </span>
            <span className='text-[10px] text-slate-400 truncate'>
              (estimates + completions across sites)
            </span>
          </div>
          <div
            className={
              (siteActivitiesQuery.data?.filter(
                (a: any) => a.sor_estimated_quantity,
              ).length || 0) > 5
                ? "max-h-40 overflow-y-auto"
                : undefined
            }>
            <Table className='w-full text-[11px]'>
              <TableHeader>
                <TableRow className='border-slate-100 hover:bg-transparent'>
                  <TableHead className='h-8 px-2 py-0 text-left font-semibold text-slate-500 uppercase tracking-wide'>
                    Activity
                  </TableHead>
                  <TableHead className='h-8 px-2 py-0 text-right font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap'>
                    SOR
                  </TableHead>
                  <TableHead className='h-8 px-2 py-0 text-right font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap'>
                    Used
                  </TableHead>
                  <TableHead className='h-8 px-2 py-0 text-right font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap'>
                    Avail.
                  </TableHead>
                  <TableHead className='h-8 px-2 py-0 text-left font-semibold text-slate-500 uppercase tracking-wide w-[88px]'>
                    %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='[&_tr]:border-slate-100'>
                {siteActivitiesQuery.data
                  ?.filter((a: any) => a.sor_estimated_quantity)
                  .map((activity: any) => {
                    const sorQty = parseFloat(
                      activity.sor_estimated_quantity || "0",
                    );
                    // total_used_quantity = sum across sites of
                    // max(completion_qty, estimate_qty). Completion takes
                    // precedence; estimate is a proxy until completion lands.
                    const usedTotal = parseFloat(
                      activity.total_used_quantity || "0",
                    );
                    const available = sorQty - usedTotal;
                    const usedPct =
                      sorQty > 0
                        ? Math.min(100, (usedTotal / sorQty) * 100)
                        : 0;
                    const barColor =
                      usedPct >= 100
                        ? "bg-red-500"
                        : usedPct >= 80
                          ? "bg-amber-500"
                          : "bg-emerald-500";

                    return (
                      <TableRow
                        key={activity.id}
                        className='hover:bg-slate-50/50'>
                        <TableCell className='px-2 py-1.5 max-w-[140px] truncate font-medium text-slate-700'>
                          {formatName(activity.activity)}
                        </TableCell>
                        <TableCell className='px-2 py-1.5 text-right tabular-nums text-slate-600 whitespace-nowrap'>
                          {sorQty.toFixed(2)}{" "}
                          <span className='text-slate-400 font-normal'>
                            {activity.unit || "Nos"}
                          </span>
                        </TableCell>
                        <TableCell className='px-2 py-1.5 text-right tabular-nums text-amber-700'>
                          {usedTotal.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`px-2 py-1.5 text-right tabular-nums font-semibold ${
                            available < 0 ? "text-red-600" : "text-emerald-700"
                          }`}>
                          {available.toFixed(2)}
                        </TableCell>
                        <TableCell className='px-2 py-1.5'>
                          <div className='flex items-center gap-1.5 min-w-0'>
                            <div className='h-1 flex-1 min-w-[36px] bg-slate-100 rounded-full overflow-hidden'>
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{
                                  width: `${Math.min(100, usedPct)}%`,
                                }}
                              />
                            </div>
                            <span className='text-[10px] tabular-nums text-slate-500 w-8 text-right shrink-0'>
                              {usedPct.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Main Phase Card */}
      <div className='rounded-xl bg-white overflow-hidden'>
        {/* Header */}
        <div className='py-4 border-b border-slate-200'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              {/* <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  processType === "bioremediation"
                    ? "bg-violet-100 text-violet-600"
                    : "bg-blue-100 text-blue-600"
                }`}>
                {processType === "bioremediation" ? (
                  <FlaskConical className='w-4.5 h-4.5' />
                ) : (
                  <Building2 className='w-4.5 h-4.5' />
                )}
              </div> */}
              <div>
                <h3 className='text-sm font-bold text-gray-800'>
                  {processType === "bioremediation"
                    ? "Bioremediation Data"
                    : "Restoration Data"}
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
          /* Tabs inside card */
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

      {processType === "bioremediation" && (
        <BioremediationSections woSiteId={woSiteId} />
      )}
    </div>
  );
};

export default SiteActivities;
