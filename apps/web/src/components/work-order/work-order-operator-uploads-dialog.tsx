"use client";

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowUpDown,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { capitalFirstLetter, constants } from "@pkg/utils";
import DialogWindow from "@/components/shared/dialog-window";
import RecordCode from "@/components/shared/record-code";
import {
  ALL,
  ClearFiltersButton,
  FilterBar,
  SelectFilter,
} from "@/components/filters/list-filters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import useHandleParams from "@/hooks/useHandleParams";
import { PROCESS_TONES } from "./process-section-header";

const { WO_PROCESS } = constants;

interface Props {
  workOrderId: number;
  workOrderCode: string;
}

type UploadRow =
  RouterOutputs["workOrderSiteQuery"]["getOperatorUploadsByWorkOrder"][number];

// Uploads come from the restoration or a bioremediation site.
type ProcessFilter =
  | typeof ALL
  | typeof WO_PROCESS.RESTORATION
  | typeof WO_PROCESS.BIOREMEDIATION;

const PROCESSES = [
  {
    value: WO_PROCESS.RESTORATION,
    label: "Restoration",
    Icon: RotateCcw,
    tone: PROCESS_TONES.restoration.icon,
  },
  {
    value: WO_PROCESS.BIOREMEDIATION,
    label: "Bioremediation",
    Icon: FlaskConical,
    tone: PROCESS_TONES.bioremediation.icon,
  },
] as const;

type UploadSort = "newest" | "oldest" | "site" | "file";

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "By site", value: "site" },
  { label: "By file name", value: "file" },
];

const isImageFileName = (fileName: string | null | undefined) =>
  !!fileName && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName.trim());

const time = (row: UploadRow) =>
  row.created_at ? new Date(row.created_at).getTime() : 0;

const byName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

// Ties fall back to the newest first, so the order never jumps about.
const SORTERS: Record<UploadSort, (a: UploadRow, b: UploadRow) => number> = {
  newest: (a, b) => time(b) - time(a),
  oldest: (a, b) => time(a) - time(b),
  site: (a, b) => byName(a.site_name, b.site_name) || time(b) - time(a),
  file: (a, b) =>
    byName(a.file_name ?? "", b.file_name ?? "") || time(b) - time(a),
};

// Everything field operators uploaded across the work order: at its
// restoration and at each bioremediation site. Narrowed by process and site,
// and sorted by date, site or file name.
export function WorkOrderOperatorUploadsDialog({
  workOrderId,
  workOrderCode,
}: Props) {
  const { getParam, deleteParams } = useHandleParams();
  const open = getParam("dialog") === "operator-uploads";

  const [processType, setProcessType] = useState<ProcessFilter>(ALL);
  const [siteId, setSiteId] = useState<string>(ALL);
  const [sort, setSort] = useState<UploadSort>("newest");

  const { data, isLoading } =
    trpc.workOrderSiteQuery.getOperatorUploadsByWorkOrder.useQuery(
      { work_order_id: workOrderId },
      { enabled: open && workOrderId > 0 },
    );
  const uploads = (data ?? []) as UploadRow[];

  const counts = {
    [ALL]: uploads.length,
    [WO_PROCESS.RESTORATION]: uploads.filter(
      (row) => row.process_type === WO_PROCESS.RESTORATION,
    ).length,
    [WO_PROCESS.BIOREMEDIATION]: uploads.filter(
      (row) => row.process_type === WO_PROCESS.BIOREMEDIATION,
    ).length,
  };

  const inProcess = (row: UploadRow) =>
    processType === ALL || row.process_type === processType;

  // The sites with uploads in the chosen process, each once, by name.
  const siteOptions = useMemo(() => {
    const sites = new Map<number, string>();
    for (const row of uploads) {
      if (inProcess(row)) sites.set(row.work_order_site_id, row.site_name);
    }
    return [
      { label: "All sites", value: ALL },
      ...[...sites]
        .sort(([, a], [, b]) => byName(a, b))
        .map(([id, name]) => ({
          label: capitalFirstLetter(name),
          value: String(id),
        })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads, processType]);

  const shown = uploads
    .filter(
      (row) =>
        inProcess(row) &&
        (siteId === ALL || String(row.work_order_site_id) === siteId),
    )
    .sort(SORTERS[sort]);

  const isFiltered = processType !== ALL || siteId !== ALL;
  const clearFilters = () => {
    setProcessType(ALL);
    setSiteId(ALL);
  };

  const handleClose = () => {
    clearFilters();
    setSort("newest");
    deleteParams(["dialog"]);
  };

  return (
    <DialogWindow
      open={open}
      setOpen={(next) => {
        if (!next) handleClose();
      }}
      title='Operator uploads'
      description={`${workOrderCode.toUpperCase()}: documents field operators uploaded at its restoration and sites.`}
      size='xl'
      heightMode='fixed'
      isLoading={isLoading}
      loadingSkeleton='list'>
      {uploads.length === 0 ? (
        <div className='py-10 text-center'>
          <FolderOpen className='mx-auto size-6 text-gray-300' />
          <p className='mt-2 text-sm font-medium text-gray-900'>
            Nothing uploaded yet
          </p>
          <p className='mt-1 text-xs text-gray-500'>
            Documents the restoration&apos;s and sites&apos; operators upload
            appear here.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          <Tabs
            value={processType}
            onValueChange={(value) => {
              setProcessType(value as ProcessFilter);
              // The chosen site may not be in the new process.
              setSiteId(ALL);
            }}>
            <TabsList className='h-8'>
              <TabsTrigger
                value={ALL}
                className='gap-1.5 px-2.5 text-xs text-gray-800'>
                All
                <span className='tabular-nums text-gray-400'>
                  {counts[ALL]}
                </span>
              </TabsTrigger>
              {PROCESSES.map(({ value, label, Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  disabled={counts[value] === 0}
                  className='gap-1.5 px-2.5 text-xs text-gray-800'>
                  <Icon className='size-3.5 text-gray-500' />
                  {label}
                  <span className='tabular-nums text-gray-400'>
                    {counts[value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <FilterBar>
            <SelectFilter
              label='Site'
              Icon={MapPin}
              value={siteId}
              onChange={setSiteId}
              options={siteOptions}
            />
            <SelectFilter
              label='Sort uploads'
              Icon={ArrowUpDown}
              value={sort}
              onChange={(value) => setSort(value as UploadSort)}
              options={SORT_OPTIONS}
              defaultValue={null}
            />
            {isFiltered && <ClearFiltersButton onClick={clearFilters} />}
            <p className='col-span-2 text-xs text-gray-500 sm:ml-auto'>
              {shown.length === uploads.length
                ? `${uploads.length} upload${uploads.length !== 1 ? "s" : ""}`
                : `${shown.length} of ${uploads.length} uploads`}
            </p>
          </FilterBar>

          {shown.length === 0 ? (
            <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-500'>
              No uploads match these filters.
            </p>
          ) : (
            <ScrollArea className='h-[min(460px,55vh)] pr-3'>
              <ul className='divide-y divide-gray-100 rounded-lg border border-gray-200'>
                {shown.map((row) => (
                  <UploadItem
                    key={row.id}
                    row={row}
                  />
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      )}
    </DialogWindow>
  );
}

// One upload: its file, where it came from, and who uploaded it when.
const UploadItem = ({ row }: { row: UploadRow }) => {
  const processInfo = PROCESSES.find(
    (option) => option.value === row.process_type,
  );
  const fileName = row.file_name ?? `Document #${row.id}`;

  return (
    <li className='flex items-start gap-3 p-3 text-sm'>
      {isImageFileName(row.file_name) ? (
        <a
          href={row.document_url}
          target='_blank'
          rel='noopener noreferrer'
          className='shrink-0'>
          <img
            src={row.document_url}
            alt={fileName}
            loading='lazy'
            className='size-11 rounded-md border border-gray-200 bg-white object-cover'
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </a>
      ) : (
        <div className='flex size-11 shrink-0 items-center justify-center rounded-md bg-gray-50 ring-1 ring-inset ring-gray-200'>
          <FileText className='size-4 text-gray-400' />
        </div>
      )}

      <div className='min-w-0 flex-1 space-y-1'>
        <a
          href={row.document_url}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex max-w-full items-center gap-1 font-medium text-gray-900 hover:text-emerald-700 hover:underline'>
          <span className='truncate'>{fileName}</span>
          <ExternalLink className='size-3 shrink-0 opacity-60' />
        </a>
        <div className='flex flex-wrap items-center gap-1.5 text-xs text-gray-600'>
          {processInfo && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                processInfo.tone,
              )}>
              <processInfo.Icon className='size-3' />
              {processInfo.label}
            </span>
          )}
          {row.site_code && <RecordCode code={row.site_code} />}
          <span className='font-medium text-gray-700'>
            {capitalFirstLetter(row.site_name)}
          </span>
        </div>
        {row.description && (
          <p className='text-xs leading-relaxed text-gray-600'>
            {row.description}
          </p>
        )}
        <p className='text-[11px] text-gray-400'>
          {row.uploaded_by_name}
          {row.created_at &&
            ` · ${format(new Date(row.created_at), "d MMM yyyy, h:mm a")}`}
        </p>
      </div>
    </li>
  );
};
