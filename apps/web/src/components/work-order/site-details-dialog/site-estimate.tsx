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
import UploadSectionHeader from "@/components/shared/upload-section-header";

// The contaminated soil record the estimate is saved as, and the site
// document type of its estimate document.
const ESTIMATE = "estimate_sub-wo";
const ESTIMATE_DOCUMENT = "estimate";

const formatQty = (value: string | number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    Number(value) || 0,
  );

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value,
  );

const headClass =
  "h-8 px-3 sm:h-8 sm:px-3 text-[11px] font-medium text-gray-400 whitespace-nowrap";
const cellClass = "px-3 py-2 sm:px-3 sm:py-2 text-[13px]";
const numberClass = cn(
  cellClass,
  "whitespace-nowrap text-right tabular-nums text-gray-700",
);

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

  // The saved estimate, or blanks to fill in.
  const loadSaved = useCallback(() => {
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

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  // Leaving edit mode drops the changes that weren't saved.
  const cancelEdit = () => {
    loadSaved();
    setIsEditMode(false);
  };

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

  const actions = isReadOnly ? (
    <CustomButton
      variant='outline'
      text='Edit'
      Icon={Pencil}
      onClick={() => setIsEditMode(true)}
      type='button'
      className='h-7 px-2.5 text-xs'
      disableForViewer
    />
  ) : (
    <>
      {hasExistingData && (
        <CustomButton
          variant='outline'
          text='Cancel'
          onClick={cancelEdit}
          type='button'
          disabled={isLoading}
          className='h-7 px-2.5 text-xs'
        />
      )}
      <CustomButton
        variant='primary'
        text='Save estimate'
        onClick={handleSaveAll}
        type='button'
        loading={isLoading}
        disabled={isLoading}
        className='h-7 px-2.5 text-xs'
        disableForViewer
      />
    </>
  );

  // A number as typed, shown with its unit while the estimate is read-only.
  const renderQuantity = (
    value: string,
    unit: string,
    field: "estimated_quantity" | "oil_zapper_quantity",
    activityKey: string,
    placeholder: string,
  ) =>
    isReadOnly ? (
      value ? (
        <>
          {formatQty(value)} <span className='text-xs text-gray-400'>{unit}</span>
        </>
      ) : (
        <span className='text-gray-300'>—</span>
      )
    ) : (
      <div className='flex items-center justify-end gap-1.5'>
        <Input
          inputMode='decimal'
          value={value}
          onChange={(e) => handleChange(activityKey, field, e.target.value)}
          placeholder={placeholder}
          aria-label={`${field === "oil_zapper_quantity" ? "Oil zapper" : "Estimated"} quantity in ${unit}`}
          className='h-8 w-28 bg-white text-right text-[13px] tabular-nums placeholder:text-gray-300'
        />
        <span className='w-8 text-left text-xs text-gray-400'>{unit}</span>
      </div>
    );

  return (
    <div className='space-y-3'>
      <EstimateHeader actions={actions} />

      <div className='grid grid-cols-1 gap-3 lg:grid-cols-3'>
        <DocumentsField
          label='Doc upload'
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
          className='self-start'
        />

        <div className='self-start overflow-hidden rounded-lg border border-gray-200 bg-white lg:col-span-2'>
          <Table>
            <TableHeader>
              <TableRow className='border-gray-100 hover:bg-transparent'>
                <TableHead className={headClass}>Activity</TableHead>
                <TableHead className={cn(headClass, "text-right")}>Rate</TableHead>
                <TableHead className={cn(headClass, "text-right")}>
                  Est. quantity
                </TableHead>
                {showOilZapper && (
                  <TableHead className={cn(headClass, "text-right")}>
                    {/* Named as the change request (M6) asks. */}
                    {`Tot. Est. ${constants.OIL_ZAPPER.LABEL} Qty (${constants.OIL_ZAPPER.UNIT})`}
                  </TableHead>
                )}
                <TableHead className={cn(headClass, "text-right")}>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => {
                const currentData = formData[activity.activity] || {
                  estimated_quantity: "",
                  amount: "",
                  transportation_km: "",
                  oil_zapper_quantity: "",
                };
                const isBioremActivity =
                  isBioremediation && isBioremActivityKey(activity.activity);
                const unit = activity.unit || "Nos";
                const amount = Number(currentData.amount) || 0;

                return (
                  <TableRow
                    key={activity.id}
                    className='border-gray-100 hover:bg-transparent'>
                    <TableCell
                      className={cn(
                        cellClass,
                        "min-w-44 whitespace-normal font-medium text-gray-800",
                      )}>
                      {formatName(activity.activity)}
                    </TableCell>
                    <TableCell className={numberClass}>
                      {formatCurrency(Number(activity.rate) || 0)}
                      <span className='text-xs text-gray-400'> / {unit}</span>
                    </TableCell>
                    <TableCell className={numberClass}>
                      {renderQuantity(
                        currentData.estimated_quantity,
                        unit,
                        "estimated_quantity",
                        activity.activity,
                        activity.sor_estimated_quantity
                          ? `Max ${formatQty(activity.sor_estimated_quantity)}`
                          : "0",
                      )}
                    </TableCell>
                    {showOilZapper && (
                      <TableCell className={numberClass}>
                        {isBioremActivity ? (
                          renderQuantity(
                            currentData.oil_zapper_quantity,
                            constants.OIL_ZAPPER.UNIT,
                            "oil_zapper_quantity",
                            activity.activity,
                            "0",
                          )
                        ) : (
                          <span className='text-gray-300'>—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell
                      className={cn(
                        numberClass,
                        amount > 0 ? "font-semibold text-gray-900" : "text-gray-300",
                      )}>
                      {amount > 0 ? formatCurrency(amount) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

// The estimate's title on one line, with its actions on the right.
const EstimateHeader = ({ actions }: { actions?: React.ReactNode }) => (
  <div className='flex flex-wrap items-center justify-between gap-2'>
    <UploadSectionHeader
      Icon={Calculator}
      title='Estimate'
      description='The estimate document and the quantities it sets for this site.'
      className='flex-1'
    />
    {actions && <div className='flex items-center gap-2'>{actions}</div>}
  </div>
);

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
    <div className={className}>
      {siteActivitiesQuery.data && siteActivitiesQuery.data.length > 0 ? (
        <EstimateForm
          woSiteId={woSiteId}
          processType={processType}
          activities={siteActivitiesQuery.data}
          getActivityData={getActivityData}
          siteDocuments={siteDocumentsQuery.data}
        />
      ) : (
        <div className='space-y-3'>
          <EstimateHeader />
          <p className='rounded-lg border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-400'>
            {siteActivitiesQuery.isLoading
              ? "Loading the site's activities…"
              : "This site has no activities to estimate."}
          </p>
        </div>
      )}
    </div>
  );
};

export default SiteEstimate;
