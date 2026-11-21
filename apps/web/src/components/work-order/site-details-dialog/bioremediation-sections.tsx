import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/shared/date-picker";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Trash2,
  FileText,
  FlaskConical,
  Droplet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useIsViewer } from "@/contexts/AuthContext";
import CustomButton from "@/components/shared/btn";
import {
  LIST_CELL,
  LIST_FRAME,
  LIST_HEAD,
  LIST_HEAD_ROW,
  LIST_ROW,
  LIST_SUBTEXT,
  RowActionsButton,
} from "@/components/shared/list-table";
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
import { ActivitiesSkeleton } from "@/components/skeleton/work-order/site-skeletons";

// Today, as a date input value.
const todayInput = () => format(new Date(), "yyyy-MM-dd");

// A date input value as the ISO date-time the API takes.
const toIsoDate = (value: string) => new Date(value).toISOString();

// The date picker shown with each treatment entry.
const EntryDateField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className='text-[10px] text-slate-600 font-medium mb-1 block'>
      {label}
    </label>
    <DatePicker
      value={value}
      max={todayInput()}
      onChange={onChange}
      aria-label={label}
      className='h-9'
    />
  </div>
);

// Completion depends on the latest TPH, so the site's status may change.
const refreshSiteStatus = (utils: ReturnType<typeof trpc.useUtils>) => {
  utils.workOrderSiteQuery.getWorkOrderSiteDetails.invalidate();
  utils.workOrderQuery.getWorkOrderDetails.invalidate();
  utils.workOrderSiteQuery.getSiteActivities.invalidate();
};

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
  const [sampledOn, setSampledOn] = useState(todayInput);
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
        refreshSiteStatus(utils);
        setTphValue("");
        setApplicationMonth("");
        setSampledOn(todayInput());
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
    if (!sampledOn) {
      toast.error("Please enter the date the sample was taken");
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
          sampled_on: toIsoDate(sampledOn),
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
          <EntryDateField
            label='Sampled On'
            value={sampledOn}
            onChange={setSampledOn}
          />
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
  const [appliedOn, setAppliedOn] = useState(todayInput);
  const [files, setFiles] = useState<File[]>([]);

  // Oil zapping applies oil zapper the site's expenses have procured.
  const stockQuery = trpc.workOrderSiteQuery.getOilZapperStock.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId },
  );
  const procured = stockQuery.data?.procured ?? 0;
  const used = stockQuery.data?.used ?? 0;
  const remaining = Math.max(0, stockQuery.data?.left ?? 0);

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
        utils.workOrderSiteQuery.getOilZapperStock.invalidate({
          work_order_site_id: woSiteId,
        });
        setEstimatedQuantity("");
        setAppliedOn(todayInput());
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

    if (!appliedOn) {
      toast.error("Please enter the date the oil zapper was applied");
      return;
    }

    if (procured <= 0) {
      toast.error(
        "No oil zapper has been procured yet. Record its purchase as an expense first.",
      );
      return;
    }

    if (enteredQty > remaining) {
      toast.error(
        `Only ${remaining.toFixed(2)} ${constants.OIL_ZAPPER.UNIT} of procured oil zapper is left to apply.`,
      );
      return;
    }

    try {
      const uploaded = await uploadFiles(files);
      if (uploaded) {
        createMutation.mutate({
          work_order_site_id: woSiteId,
          documents: uploaded.map(toStoredDocument),
          estimated_quantity: enteredQty.toFixed(2),
          applied_on: toIsoDate(appliedOn),
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
            Quantity applied ({constants.OIL_ZAPPER.UNIT})
          </label>
          <Input
            value={estimatedQuantity}
            onChange={(e) => setEstimatedQuantity(e.target.value)}
            placeholder='0.00'
            className='h-9'
          />
          {procured > 0 && (
            <p className='mt-1 text-[10px] text-slate-500'>
              Procured:{" "}
              <span className='font-semibold tabular-nums'>
                {procured.toFixed(2)}
              </span>
              {" · "}Used:{" "}
              <span className='font-semibold tabular-nums'>
                {used.toFixed(2)}
              </span>
              {" · "}Left:{" "}
              <span className='font-semibold tabular-nums'>
                {remaining.toFixed(2)}
              </span>
            </p>
          )}
        </div>

        <EntryDateField
          label='Applied On'
          value={appliedOn}
          onChange={setAppliedOn}
        />

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
  // When the sample was taken or oil zapper applied, else when it was added.
  date: string;
  tph_value?: string;
  documents: StoredDocument[];
  original: any;
}

type ActivityFilter = "all" | CombinedItem["type"];

// How each kind of activity is named and marked.
const KINDS = {
  bio: {
    label: "Bio sample",
    plural: "Bio samples",
    Icon: FlaskConical,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  oil: {
    label: "Oil zapping",
    plural: "Oil zapping",
    Icon: Droplet,
    tone: "bg-sky-50 text-sky-700 ring-sky-100",
  },
} as const;

const formatNumber = (value: number) =>
  value.toLocaleString("en-IN", { maximumFractionDigits: 2 });

type ActivityActions = {
  canDelete: boolean;
  onDeleteBio: (id: number) => void;
  onDeleteOil: (id: number) => void;
};

// What an activity is, with its icon: a bio sample and its month, or oil
// zapping.
const ActivityName = ({ item }: { item: CombinedItem }) => {
  const kind = KINDS[item.type];
  return (
    <div className='flex min-w-0 items-center gap-3'>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md ring-1 ring-inset",
          kind.tone,
        )}>
        <kind.Icon className='size-4' />
      </span>
      <div className='min-w-0'>
        <p className='font-medium text-gray-900'>{kind.label}</p>
        <p className={LIST_SUBTEXT}>
          {item.type === "bio"
            ? (item.application_month ?? "Monthly sample")
            : "Oil zapper applied"}
        </p>
      </div>
    </div>
  );
};

// A bio sample's TPH, or how much oil zapper was applied.
const ActivityReading = ({ item }: { item: CombinedItem }) =>
  item.type === "bio" ? (
    <>
      <span className='mr-1.5 text-xs text-gray-500'>TPH</span>
      <span className='font-semibold tabular-nums text-gray-900'>
        {item.tph_value ?? "—"}
      </span>
    </>
  ) : (
    <>
      <span className='font-semibold tabular-nums text-gray-900'>
        {item.estimated_quantity
          ? formatNumber(Number(item.estimated_quantity))
          : "—"}
      </span>
      <span className='ml-1 text-xs text-gray-500'>
        {constants.OIL_ZAPPER.UNIT}
      </span>
    </>
  );

const ActivityDocuments = ({ item }: { item: CombinedItem }) =>
  item.documents.length > 0 ? (
    <DocumentsMenu
      documents={item.documents}
      align='start'>
      <button
        type='button'
        className='inline-flex cursor-pointer items-center gap-1.5 text-gray-700 transition-colors hover:text-emerald-700 hover:underline'>
        <FileText className='size-3.5 text-gray-400' />
        {item.documents.length === 1
          ? item.type === "bio"
            ? "View report"
            : "View document"
          : `${item.documents.length} documents`}
      </button>
    </DocumentsMenu>
  ) : (
    <span className='text-gray-300'>—</span>
  );

const ActivityMenu = ({
  item,
  canDelete,
  onDeleteBio,
  onDeleteOil,
}: { item: CombinedItem } & ActivityActions) => {
  const kind = KINDS[item.type];
  const name =
    item.type === "bio" && item.application_month
      ? `${kind.label}, ${item.application_month}`
      : kind.label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <RowActionsButton label={`Actions for ${name}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          disabled={!canDelete}
          onClick={() =>
            item.type === "bio" ? onDeleteBio(item.id) : onDeleteOil(item.id)
          }
          className='text-red-600 focus:text-red-600'>
          <Trash2 className='mr-2 h-4 w-4' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const activityDate = (item: CombinedItem) =>
  format(new Date(item.date), "d MMM yyyy");

// A site's bio samples and oil zapping, newest first, in the portal's list
// table look: what it was, its reading, when, its documents and a menu.
// Phones get a card for each instead.
const CombinedList = ({
  items,
  total,
  ...actions
}: {
  items: CombinedItem[];
  // How many there are before the type tabs narrow them.
  total: number;
} & ActivityActions) => {
  const emptyText =
    total === 0
      ? "No bio samples or oil zapping recorded yet."
      : "None of this kind recorded yet.";

  return (
    <div className={LIST_FRAME}>
      <ul className='divide-y divide-gray-100 md:hidden'>
        {items.length === 0 ? (
          <li className='py-8 text-center text-xs text-gray-500'>
            {emptyText}
          </li>
        ) : (
          items.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className='flex items-start gap-2 px-4 py-3 text-sm'>
              <div className='min-w-0 flex-1 space-y-2'>
                <div className='flex items-start justify-between gap-3'>
                  <ActivityName item={item} />
                  <div className='shrink-0 whitespace-nowrap pt-0.5 text-right'>
                    <ActivityReading item={item} />
                    <p className={LIST_SUBTEXT}>{activityDate(item)}</p>
                  </div>
                </div>
                {item.documents.length > 0 && (
                  <div className='pl-11 text-xs'>
                    <ActivityDocuments item={item} />
                  </div>
                )}
              </div>
              <div className='-mr-2'>
                <ActivityMenu
                  item={item}
                  {...actions}
                />
              </div>
            </li>
          ))
        )}
      </ul>

      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow className={LIST_HEAD_ROW}>
              <TableHead className={LIST_HEAD}>Activity</TableHead>
              <TableHead className={LIST_HEAD}>Reading</TableHead>
              <TableHead className={LIST_HEAD}>Dated</TableHead>
              <TableHead className={LIST_HEAD}>Documents</TableHead>
              <TableHead className={cn(LIST_HEAD, "w-px")}>
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow className={cn(LIST_ROW, "hover:bg-transparent")}>
                <TableCell
                  colSpan={5}
                  className='py-8 text-center text-xs text-gray-500'>
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={`${item.type}-${item.id}`}
                  className={LIST_ROW}>
                  <TableCell className={LIST_CELL}>
                    <ActivityName item={item} />
                  </TableCell>
                  <TableCell className={cn(LIST_CELL, "whitespace-nowrap")}>
                    <ActivityReading item={item} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      LIST_CELL,
                      "whitespace-nowrap text-gray-600",
                    )}>
                    {activityDate(item)}
                  </TableCell>
                  <TableCell className={LIST_CELL}>
                    <ActivityDocuments item={item} />
                  </TableCell>
                  <TableCell
                    className={cn(LIST_CELL, "py-2 text-right sm:py-2")}>
                    <ActivityMenu
                      item={item}
                      {...actions}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className='border-t border-gray-200 bg-gray-50/60 px-4 py-2 text-xs text-gray-500'>
        {items.length === total
          ? `${total} ${total === 1 ? "activity" : "activities"}`
          : `Showing ${items.length} of ${total} activities`}
      </div>
    </div>
  );
};

export const BioremediationSections = ({ woSiteId }: { woSiteId: number }) => {
  const utils = trpc.useUtils();
  const isViewer = useIsViewer();
  const [bioDialogOpen, setBioDialogOpen] = useState(false);
  const [oilDialogOpen, setOilDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<ActivityFilter>("all");

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
        refreshSiteStatus(utils);
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
        utils.workOrderSiteQuery.getOilZapperStock.invalidate({
          work_order_site_id: woSiteId,
        });
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
    return <ActivitiesSkeleton />;
  }

  // The zero day sample lives in the site information card.
  const bioSamples = (bioremediationDataQuery.data?.bioSamples || []).filter(
    (item: any) => item.application_month !== constants.ZERO_DAY_SAMPLE,
  );
  const oilZapping = bioremediationDataQuery.data?.oilZapping || [];

  const combinedItems: CombinedItem[] = [
    ...bioSamples.map((item: any) => ({
      id: item.id,
      type: "bio" as const,
      application_month: item.application_month,
      date: item.sampled_on ?? item.created_at,
      tph_value: item.tph_value,
      documents: toDocuments(item.documents),
      original: item,
    })),
    ...oilZapping.map((item: any) => ({
      id: item.id,
      type: "oil" as const,
      estimated_quantity: item.estimated_quantity,
      date: item.applied_on ?? item.created_at,
      documents: toDocuments(item.documents),
      original: item,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredItems = combinedItems.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  const counts: Record<ActivityFilter, number> = {
    all: combinedItems.length,
    bio: bioSamples.length,
    oil: oilZapping.length,
  };
  const applied = oilZapping.reduce(
    (sum: number, item: any) => sum + (Number(item.estimated_quantity) || 0),
    0,
  );

  return (
    <div className='space-y-4'>
      {/* What has been recorded, and adding to it. */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <h3 className='text-sm font-semibold text-gray-900'>
            Bioremediation activities
          </h3>
          <p className='mt-0.5 text-xs text-gray-500'>
            {counts.bio} bio sample{counts.bio !== 1 ? "s" : ""}
            <span className='text-gray-300'> · </span>
            <span className='font-semibold tabular-nums text-gray-900'>
              {formatNumber(applied)} {constants.OIL_ZAPPER.UNIT}
            </span>{" "}
            of oil zapper applied over {counts.oil}{" "}
            {counts.oil === 1 ? "entry" : "entries"}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <CustomButton
            text='Add bio sample'
            variant='outline'
            Icon={FlaskConical}
            onClick={() => setBioDialogOpen(true)}
            className='h-8 text-xs'
            disableForViewer
          />
          <CustomButton
            text='Add oil zapping'
            variant='primary'
            Icon={Droplet}
            onClick={() => setOilDialogOpen(true)}
            className='h-8 text-xs'
            disableForViewer
          />
        </div>
      </div>

      {combinedItems.length > 0 && (
        <Tabs
          value={filterType}
          onValueChange={(value) => setFilterType(value as ActivityFilter)}>
          <TabsList className='h-8'>
            {(["all", "bio", "oil"] as const).map((value) => {
              const Icon = value === "all" ? null : KINDS[value].Icon;
              return (
                <TabsTrigger
                  key={value}
                  value={value}
                  className='gap-1.5 px-2.5 text-xs text-gray-800'>
                  {Icon && <Icon className='size-3.5 text-gray-500' />}
                  {value === "all" ? "All" : KINDS[value].plural}
                  <span className='tabular-nums text-gray-400'>
                    {counts[value]}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      <CombinedList
        items={filteredItems}
        total={combinedItems.length}
        canDelete={!isViewer}
        onDeleteBio={handleDeleteBioSample}
        onDeleteOil={handleDeleteOilZapping}
      />

      <Dialog
        open={bioDialogOpen}
        onOpenChange={setBioDialogOpen}>
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
  );
};
