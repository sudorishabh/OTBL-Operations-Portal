import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { constants } from "@pkg/utils";
import { Calculator, Pencil } from "lucide-react";
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

// The contaminated soil record the estimate is saved as, and the site
// document type of its estimate document.
const ESTIMATE = "estimate_sub-wo";
const ESTIMATE_DOCUMENT = "estimate";

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

const EstimateForm = ({
  woSiteId,
  processType,
  activities,
  getActivityData,
  siteDocuments,
}: {
  woSiteId: number;
  processType: string | undefined;
  activities: {
    id: number;
    activity: string;
    unit: string | null;
    rate?: string | null;
    sor_estimated_quantity?: string | null;
  }[];
  getActivityData: (
    activityKey: string,
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
}) => {
  const utils = trpc.useUtils();
  const isBioremediation = processType === "bioremediation";
  // The estimate also plans how much oil zapper the bioremediation soil needs.
  const showOilZapper = isBioremediation;

  const [formData, setFormData] = useState<Record<string, ActivityData>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const hasExistingData = React.useMemo(() => {
    return activities.some((activity) => {
      const data = getActivityData(activity.activity, isBioremediation);
      return data && data.estimated_quantity != null && data.estimated_quantity !== "";
    });
  }, [activities, getActivityData, isBioremediation]);

  const isReadOnly = hasExistingData && !isEditMode;

  // Estimate documents waiting to upload.
  const [pendingDocs, setPendingDocs] = useState<File[]>([]);

  const {
    uploadFiles,
    isUploading: isFileUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/${ESTIMATE}`,
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
      const data = getActivityData(activity.activity, isBioremediation);
      newFormData[activity.activity] = {
        estimated_quantity: data?.estimated_quantity?.toString() || "",
        amount: data?.amount?.toString() || "",
        transportation_km: data?.transportation_km?.toString() || "",
        oil_zapper_quantity: data?.oil_zapper_quantity?.toString() || "",
      };
    });
    setFormData(newFormData);
  }, [activities, getActivityData, isBioremediation]);

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
        // The estimate sets the site's SOR share and oil zapper plan.
        utils.workOrderSiteQuery.getWorkOrderSiteDetails.invalidate({
          work_order_site_id: woSiteId,
        });
        utils.workOrderQuery.getWorkOrderDetails.invalidate();
        utils.workOrderSiteQuery.getSiteActivities.invalidate({
          work_order_site_id: woSiteId,
        });
        utils.workOrderSiteQuery.getOilZapperStock.invalidate({
          work_order_site_id: woSiteId,
        });
        utils.workOrderSiteQuery.getSiteDocuments.invalidate();
        utils.expenseQuery.getExpenseSummary.invalidate({
          work_order_site_id: woSiteId,
        });
        utils.expenseQuery.getExpenses.invalidate({
          work_order_site_id: woSiteId,
        });
        setPendingDocs([]);
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

  const savedDocs =
    siteDocuments?.filter((d) => d.type === ESTIMATE_DOCUMENT) ?? [];

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
      toast.error("Please fill in the total estimated Oil Zapper quantity.");
      return;
    }

    if (savedDocs.length + pendingDocs.length === 0) {
      toast.error("Please upload the Estimate document.");
      return;
    }

    // Each uploaded file is saved as its own estimate document.
    if (pendingDocs.length > 0) {
      const uploaded = await uploadFiles(pendingDocs);
      if (!uploaded) return;

      for (const doc of uploaded) {
        await createSiteDocMutation.mutateAsync({
          work_order_site_id: woSiteId,
          type: ESTIMATE_DOCUMENT,
          document_url: doc.webUrl,
          document_id: doc.id,
        });
      }
    }

    if (isBioremediation) {
      const bioremActivity = activities.find((a) =>
        isBioremActivityKey(a.activity),
      );
      const data = bioremActivity && formData[bioremActivity.activity];
      if (data) {
        saveContaminatedSoil.mutate({
          work_order_site_id: woSiteId,
          phase: ESTIMATE,
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
  };

  const isLoading = saveContaminatedSoil.isPending || isFileUploading;

  return (
    <div className='space-y-5'>
      <div className='space-y-1.5'>
        <span className='text-[10px] font-medium text-slate-500 uppercase tracking-wider px-0.5'>
          Estimate Document
        </span>
        <DocumentsField
          label='Upload Estimate Documents'
          files={pendingDocs}
          onFilesChange={setPendingDocs}
          existing={savedDocs.map((doc, index) => ({
            url: doc.document_url,
            id: doc.document_id ?? null,
            name: `Estimate document ${index + 1}`,
          }))}
          onRemoveExisting={(index) => {
            const doc = savedDocs[index];
            if (doc && confirm("Delete this document?")) {
              deleteDocumentMutation.mutate({ id: doc.id });
            }
          }}
          isUploading={isFileUploading}
          progress={progress}
          className='rounded-xl'
        />
      </div>

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
                    {`Tot. Est. ${constants.OIL_ZAPPER.LABEL} Qty (${constants.OIL_ZAPPER.UNIT})`}
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
                  isBioremediation && isBioremActivityKey(activity.activity);

                return (
                  <TableRow
                    key={activity.id}
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
                        readOnly={isReadOnly}
                        className={`h-10 w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-center text-xs placeholder:text-slate-300 ${
                          isReadOnly
                            ? "bg-slate-50/60 text-slate-600 cursor-default"
                            : "bg-transparent"
                        }`}
                        placeholder={
                          activity.sor_estimated_quantity
                            ? `Max: ${activity.sor_estimated_quantity}`
                            : "0.00"
                        }
                      />
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
              text='Save Estimate / Sub-WO Data'
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

// The site's estimate: its document, and the quantities it sets for each of
// the site's activities.
const SiteEstimate = ({
  woSiteId,
  processType,
  className,
}: {
  woSiteId: number;
  processType: string | undefined;
  className?: string;
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

  // Only bioremediation keeps an estimate, on its contaminated soil.
  const getActivityData = useCallback(
    (activityKey: string, isBioremediation: boolean) => {
      const data = bioremediationDataQuery.data;
      if (!isBioremediation || !data || !isBioremActivityKey(activityKey)) {
        return undefined;
      }
      return data.contaminatedSoil.find((item: any) => item.type === ESTIMATE);
    },
    [bioremediationDataQuery.data],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <div className='flex items-center gap-2'>
          <Calculator className='w-3.5 h-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            Estimate
          </span>
        </div>
        <p className='mt-0.5 text-[10px] text-gray-400'>
          Upload the estimate document and enter the estimated quantities.
        </p>
      </div>

      {siteActivitiesQuery.data && siteActivitiesQuery.data.length > 0 ? (
        <EstimateForm
          woSiteId={woSiteId}
          processType={processType}
          activities={siteActivitiesQuery.data}
          getActivityData={getActivityData}
          siteDocuments={siteDocumentsQuery.data}
        />
      ) : (
        <div className='text-xs text-center text-slate-400 italic py-10 border-2 border-dashed border-slate-200 rounded-xl'>
          No activities found for this site.
        </div>
      )}
    </div>
  );
};

export default SiteEstimate;
