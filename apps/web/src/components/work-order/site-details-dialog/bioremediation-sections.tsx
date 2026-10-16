import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Trash2,
  FileText,
  FlaskConical,
  Droplet,
} from "lucide-react";
import toast from "react-hot-toast";
import DocumentsField from "@/components/shared/documents-field";
import DocumentsMenu from "@/components/shared/documents-menu";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import {
  toDocuments,
  toStoredDocument,
  type StoredDocument,
} from "@/lib/documents";
import { format } from "date-fns";
import { constants } from "@pkg/utils";

const BioSampleForm = ({
  woSiteId,
  onSuccess,
}: {
  woSiteId: number;
  onSuccess: () => void;
}) => {
  const utils = trpc.useUtils();
  const [tphValue, setTphValue] = useState("");
  const [applicationMonth, setApplicationMonth] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const MONTHS = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const j = n % 10,
      k = n % 100;
    let suffix = "th";
    if (j === 1 && k !== 11) suffix = "st";
    if (j === 2 && k !== 12) suffix = "nd";
    if (j === 3 && k !== 13) suffix = "rd";
    return `${n}${suffix} Month`;
  });

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/BioSamples`,
    conflictBehavior: "rename",
  });

  const createMutation = trpc.workOrderSiteMutation.createBioSample.useMutation(
    {
      onSuccess: () => {
        toast.success("Bio sample added successfully");
        utils.workOrderSiteQuery.getBioremediationData.invalidate();
        setTphValue("");
        setApplicationMonth("");
        setFiles([]);
        resetUpload();
        onSuccess();
      },
      onError: (err: any) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to add the sample. Please try again.";
        toast.error(`Failed to add sample: ${message}`);
      },
    },
  );

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one TPH document");
      return;
    }
    if (!tphValue) {
      toast.error("Please enter TPH value");
      return;
    }
    if (!applicationMonth) {
      toast.error("Please select application month");
      return;
    }

    try {
      const uploaded = await uploadFiles(files);
      if (uploaded) {
        createMutation.mutate({
          work_order_site_id: woSiteId,
          documents: uploaded.map(toStoredDocument),
          tph_value: tphValue.replace(",", "."),
          application_month: applicationMonth,
        });
      }
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  const isPending = isUploading || createMutation.isPending;

  return (
    <div className='grid gap-4 py-4'>
      <div className='grid grid-cols-1 gap-4'>
        <div>
          <DocumentsField
            label='TPH Documents'
            files={files}
            onFilesChange={setFiles}
            isUploading={isUploading}
            progress={progress}
          />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label className='text-[10px] text-slate-600 font-medium mb-1 block'>
              TPH Value
            </label>
            <Input
              inputMode='decimal'
              value={tphValue}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "" || /^[0-9]*[.,]?[0-9]*$/.test(next)) {
                  setTphValue(next);
                }
              }}
              placeholder='0.00'
              className='h-9'
            />
          </div>
          <div>
            <label className='text-[10px] text-slate-600 font-medium mb-1 block'>
              Application Month
            </label>
            <Select
              value={applicationMonth}
              onValueChange={setApplicationMonth}>
              <SelectTrigger className='h-9 w-full'>
                <SelectValue placeholder='Select Month' />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem
                    key={m}
                    value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className='flex justify-end pt-2'>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className='bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto'>
            {isPending ? (
              <Loader2 className='w-4 h-4 animate-spin mr-2' />
            ) : (
              <Plus className='w-4 h-4 mr-2' />
            )}
            Add Bio Sample
          </Button>
        </div>
      </div>
    </div>
  );
};

const OilZappingForm = ({
  woSiteId,
  onSuccess,
}: {
  woSiteId: number;
  onSuccess: () => void;
}) => {
  const utils = trpc.useUtils();
  const [estimatedQuantity, setEstimatedQuantity] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const bioremediationDataQuery =
    trpc.workOrderSiteQuery.getBioremediationData.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: !!woSiteId },
    );

  const estimateLimit = React.useMemo(() => {
    const estimateEntry = bioremediationDataQuery.data?.contaminatedSoil?.find(
      (i: any) => i.type === "estimate_sub-wo",
    );
    return parseFloat(estimateEntry?.estimated_quantity || "0") || 0;
  }, [bioremediationDataQuery.data?.contaminatedSoil]);

  const currentTotal = React.useMemo(() => {
    const oil = bioremediationDataQuery.data?.oilZapping || [];
    return oil.reduce(
      (sum: number, entry: any) =>
        sum + (parseFloat(entry.estimated_quantity || "0") || 0),
      0,
    );
  }, [bioremediationDataQuery.data?.oilZapping]);

  const remaining = Math.max(0, estimateLimit - currentTotal);

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/OilZapping`,
    conflictBehavior: "rename",
  });

  const createMutation =
    trpc.workOrderSiteMutation.createOilZapping.useMutation({
      onSuccess: () => {
        toast.success("Oil zapping entry added successfully");
        utils.workOrderSiteQuery.getBioremediationData.invalidate();
        setEstimatedQuantity("");
        setFiles([]);
        resetUpload();
        onSuccess();
      },
      onError: (err: any) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to add the entry. Please try again.";
        toast.error(`Failed to add entry: ${message}`);
      },
    });

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one document");
      return;
    }

    const enteredQty = parseFloat(estimatedQuantity || "0") || 0;
    if (!Number.isFinite(enteredQty) || enteredQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (estimateLimit <= 0) {
      toast.error("Please save the Contaminated Soil estimate quantity first.");
      return;
    }

    if (remaining <= 0) {
      toast.error("Oil zapping limit already reached for this site.");
      return;
    }

    try {
      const uploaded = await uploadFiles(files);
      if (uploaded) {
        const cappedQty = Math.min(enteredQty, remaining);
        if (cappedQty < enteredQty) {
          toast(
            `Quantity capped to remaining: ${cappedQty.toFixed(2)} (limit ${estimateLimit.toFixed(2)})`,
          );
        }
        createMutation.mutate({
          work_order_site_id: woSiteId,
          documents: uploaded.map(toStoredDocument),
          estimated_quantity: cappedQty.toFixed(2),
        });
      }
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  const isPending = isUploading || createMutation.isPending;

  return (
    <div className='grid gap-4 py-4'>
      <div className='grid grid-cols-1 gap-4'>
        <div>
          <DocumentsField
            label='Zapping Documents'
            files={files}
            onFilesChange={setFiles}
            isUploading={isUploading}
            progress={progress}
          />
        </div>
        <div>
          <label className='text-[10px] text-slate-600 font-medium mb-1 block'>
            Quantity
          </label>
          <Input
            value={estimatedQuantity}
            onChange={(e) => setEstimatedQuantity(e.target.value)}
            placeholder='0.00'
            className='h-9'
          />
          {estimateLimit > 0 && (
            <p className='mt-1 text-[10px] text-slate-500'>
              Limit:{" "}
              <span className='font-semibold tabular-nums'>
                {estimateLimit.toFixed(2)}
              </span>
              {" · "}Used:{" "}
              <span className='font-semibold tabular-nums'>
                {currentTotal.toFixed(2)}
              </span>
              {" · "}Remaining:{" "}
              <span className='font-semibold tabular-nums'>
                {remaining.toFixed(2)}
              </span>
            </p>
          )}
        </div>

        <div className='flex justify-end pt-2'>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className='bg-blue-600 hover:bg-blue-700 w-full sm:w-auto'>
            {isPending ? (
              <Loader2 className='w-4 h-4 animate-spin mr-2' />
            ) : (
              <Plus className='w-4 h-4 mr-2' />
            )}
            Add Oil Zapping Entry
          </Button>
        </div>
      </div>
    </div>
  );
};

interface CombinedItem {
  id: number;
  type: "bio" | "oil";
  estimated_quantity?: string;
  application_month?: string;
  created_at: string;
  tph_value?: string;
  documents: StoredDocument[];
  original: any;
}

const CombinedList = ({
  items,
  onDeleteBio,
  onDeleteOil,
}: {
  items: CombinedItem[];
  onDeleteBio: (id: number) => void;
  onDeleteOil: (id: number) => void;
}) => {
  return (
    <div className='border rounded-lg overflow-hidden bg-gray-100/50 border-slate-200 mt-4'>
      <Table className='w-full text-xs'>
        <TableHeader className='bg-slate-50/80'>
          <TableRow className='border-b hover:bg-transparent'>
            <TableHead className='w-[140px] font-semibold text-slate-600 pl-4'>
              Type
            </TableHead>
            <TableHead className='text-center font-semibold text-slate-600'>
              Key Metrics
            </TableHead>
            <TableHead className='text-center font-semibold text-slate-600'>
              Metric / Month
            </TableHead>
            <TableHead className='text-center w-[150px] font-semibold text-slate-600'>
              Document
            </TableHead>
            <TableHead className='text-center w-[120px] font-semibold text-slate-600'>
              Date Added
            </TableHead>
            <TableHead className='w-[50px]'></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className='divide-y'>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className='text-center py-8 text-slate-400 italic'>
                No bioremediation data added yet.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow
                key={`${item.type}-${item.id}`}
                className='group hover:bg-slate-50/50 transition-colors'>
                <TableCell className='pl-4 py-3 font-medium'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`p-1.5 rounded-md ${item.type === "bio" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                      {item.type === "bio" ? (
                        <FlaskConical className='w-3.5 h-3.5' />
                      ) : (
                        <Droplet className='w-3.5 h-3.5' />
                      )}
                    </div>
                    <div className='flex flex-col'>
                      <span
                        className={`${item.type === "bio" ? "text-emerald-700" : "text-blue-700"}`}>
                        {item.type === "bio" ? "Bio Sample" : "Oil Zapping"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className='text-center font-mono text-slate-600'>
                  {item.type === "bio" ? (
                    <span className='inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-100'>
                      TPH: {item.tph_value}
                    </span>
                  ) : (
                    <span className='inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] border border-blue-100'>
                      Oil Zapping
                    </span>
                  )}
                </TableCell>
                <TableCell className='text-center font-mono text-slate-600 font-medium'>
                  {item.type === "bio"
                    ? item.application_month
                    : item.estimated_quantity || "-"}
                </TableCell>
                <TableCell className='text-center'>
                  {item.documents.length > 0 ? (
                    <DocumentsMenu
                      documents={item.documents}
                      align='center'>
                      <button
                        type='button'
                        className='inline-flex cursor-pointer items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors justify-center'>
                        <FileText className='w-3.5 h-3.5' />
                        <span className='truncate max-w-[100px]'>
                          {item.documents.length === 1
                            ? "View Doc"
                            : `${item.documents.length} Docs`}
                        </span>
                      </button>
                    </DocumentsMenu>
                  ) : (
                    <span className='text-slate-300'>-</span>
                  )}
                </TableCell>
                <TableCell className='text-center text-slate-500'>
                  {format(new Date(item.created_at), "dd MMM yyyy")}
                </TableCell>
                <TableCell className='text-center pr-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() =>
                      item.type === "bio"
                        ? onDeleteBio(item.id)
                        : onDeleteOil(item.id)
                    }
                    className='text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0 transition-colors'>
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export const BioremediationSections = ({ woSiteId }: { woSiteId: number }) => {
  const utils = trpc.useUtils();
  const [bioDialogOpen, setBioDialogOpen] = useState(false);
  const [oilDialogOpen, setOilDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "bio" | "oil">("all");

  const bioremediationDataQuery =
    trpc.workOrderSiteQuery.getBioremediationData.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: !!woSiteId },
    );

  const deleteBioSampleMutation =
    trpc.workOrderSiteMutation.deleteBioSample.useMutation({
      onSuccess: () => {
        toast.success("Sample deleted");
        utils.workOrderSiteQuery.getBioremediationData.invalidate();
      },
      onError: (err: any) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to delete the sample. Please try again.";
        toast.error(`Failed to delete: ${message}`);
      },
    });

  const deleteOilZappingMutation =
    trpc.workOrderSiteMutation.deleteOilZapping.useMutation({
      onSuccess: () => {
        toast.success("Entry deleted");
        utils.workOrderSiteQuery.getBioremediationData.invalidate();
      },
      onError: (err: any) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to delete the entry. Please try again.";
        toast.error(`Failed to delete: ${message}`);
      },
    });

  const handleDeleteBioSample = (id: number) => {
    if (confirm("Are you sure you want to delete this sample?")) {
      deleteBioSampleMutation.mutate({ id });
    }
  };

  const handleDeleteOilZapping = (id: number) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      deleteOilZappingMutation.mutate({ id });
    }
  };

  if (bioremediationDataQuery.isLoading) {
    return (
      <div className='p-10 flex justify-center text-slate-400'>
        <Loader2 className='animate-spin w-6 h-6' />
      </div>
    );
  }

  // The zero day sample lives in the mobilization tab.
  const bioSamples = (bioremediationDataQuery.data?.bioSamples || []).filter(
    (item: any) => item.application_month !== constants.ZERO_DAY_SAMPLE,
  );
  const oilZapping = bioremediationDataQuery.data?.oilZapping || [];

  const combinedItems: CombinedItem[] = [
    ...bioSamples.map((item: any) => ({
      id: item.id,
      type: "bio" as const,
      application_month: item.application_month,
      created_at: item.created_at,
      tph_value: item.tph_value,
      documents: toDocuments(item.documents),
      original: item,
    })),
    ...oilZapping.map((item: any) => ({
      id: item.id,
      type: "oil" as const,
      estimated_quantity: item.estimated_quantity,
      created_at: item.created_at,
      documents: toDocuments(item.documents),
      original: item,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const filteredItems = combinedItems.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  return (
    <div className='space-y-6 pt-6 border-t border-slate-200'>
      <div className='flex flex-col sm:flex-row items-center justify-between mb-6 gap-4'>
        <div>
          <h3 className='text-sm font-semibold tracking-wide text-slate-700'>
            Bioremediation Activities
          </h3>
          <p className='text-xs text-slate-500'>
            Enter bio samples and oil zapping activities for this site.
          </p>
        </div>
        <div className='flex items-center gap-3 w-full sm:w-auto overflow-x-auto'>
          <Select
            value={filterType}
            onValueChange={(val: "all" | "bio" | "oil") => setFilterType(val)}>
            <SelectTrigger className='h-8 w-[140px] text-xs bg-white'>
              <SelectValue placeholder='Filter Activities' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Activities</SelectItem>
              <SelectItem value='bio'>Bio Samples Only</SelectItem>
              <SelectItem value='oil'>Oil Zapping Only</SelectItem>
            </SelectContent>
          </Select>

          <Dialog
            open={bioDialogOpen}
            onOpenChange={setBioDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors whitespace-nowrap h-8 text-xs'>
                <Plus className='w-3.5 h-3.5 mr-2' />
                Add Bio Sampling
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2 text-emerald-700'>
                  <FlaskConical className='w-5 h-5' />
                  Add Bio Sample
                </DialogTitle>
              </DialogHeader>
              <BioSampleForm
                woSiteId={woSiteId}
                onSuccess={() => setBioDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={oilDialogOpen}
            onOpenChange={setOilDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors whitespace-nowrap h-8 text-xs'>
                <Plus className='w-3.5 h-3.5 mr-2' />
                Add Oil Zapping
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2 text-blue-700'>
                  <Droplet className='w-5 h-5' />
                  Add Oil Zapping Entry
                </DialogTitle>
              </DialogHeader>
              <OilZappingForm
                woSiteId={woSiteId}
                onSuccess={() => setOilDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CombinedList
        items={filteredItems}
        onDeleteBio={handleDeleteBioSample}
        onDeleteOil={handleDeleteOilZapping}
      />
    </div>
  );
};
