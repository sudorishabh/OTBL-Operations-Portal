"use client";

import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
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
  ComboboxFilter,
  FilterBar,
  SelectFilter,
} from "@/components/filters/list-filters";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import useHandleParams from "@/hooks/useHandleParams";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import { PROCESS_TONES } from "./process-section-header";

const { WO_PROCESS } = constants;

const PAGE_SIZE = 20;

interface Props {
  workOrderId: number;
  workOrderCode: string;
}

type UploadsPage =
  RouterOutputs["workOrderSiteQuery"]["getOperatorUploadsByWorkOrder"];
type UploadRow = UploadsPage["uploads"][number];

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

const plural = (count: number) =>
  `${count.toLocaleString("en-IN")} upload${count !== 1 ? "s" : ""}`;

// Everything field operators uploaded across the work order: at its
// restoration and at each bioremediation site. Narrowed by process and site,
// sorted by date, site or file name, and loaded a page at a time.
export function WorkOrderOperatorUploadsDialog({
  workOrderId,
  workOrderCode,
}: Props) {
  const { getParam, deleteParams } = useHandleParams();
  const open = getParam("dialog") === "operator-uploads";

  const [processType, setProcessType] = useState<ProcessFilter>(ALL);
  const [siteId, setSiteId] = useState<string>(ALL);
  const [sort, setSort] = useState<UploadSort>("newest");

  const queryInput = {
    work_order_id: workOrderId,
    limit: PAGE_SIZE,
    process_type: processType === ALL ? undefined : processType,
    work_order_site_id: siteId === ALL ? undefined : Number(siteId),
    sort,
  };
  const { pages, loadMore } = useLoadMorePages(queryInput);

  // Each page is its own query, so a refresh updates the rows in place. A
  // new filter keeps the last rows in view until its first page arrives.
  const pageQueries: UseQueryResult<UploadsPage>[] = trpc.useQueries((t: any) =>
    pages.map((page) =>
      t.workOrderSiteQuery.getOperatorUploadsByWorkOrder(
        { ...queryInput, page },
        {
          enabled: open && workOrderId > 0,
          placeholderData: page === 1 ? keepPreviousData : undefined,
        },
      ),
    ),
  );

  const firstPage = pageQueries[0]?.data;
  const lastPage = pageQueries.at(-1)?.data;
  const uploads = pageQueries.flatMap((query) => query.data?.uploads ?? []);
  const isLoading = !!pageQueries[0]?.isLoading;
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;

  const counts = {
    [ALL]: firstPage?.counts.all ?? 0,
    [WO_PROCESS.RESTORATION]: firstPage?.counts[WO_PROCESS.RESTORATION] ?? 0,
    [WO_PROCESS.BIOREMEDIATION]:
      firstPage?.counts[WO_PROCESS.BIOREMEDIATION] ?? 0,
  };
  const shownTotal = firstPage?.pagination.total ?? 0;

  // The sites with uploads in the chosen process, by name.
  const siteOptions = (firstPage?.sites ?? []).map((site) => ({
    label: capitalFirstLetter(site.name),
    value: String(site.id),
  }));

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
      {counts[ALL] === 0 ? (
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
            <ComboboxFilter
              label='Site'
              allLabel='All sites'
              Icon={MapPin}
              value={siteId}
              onChange={setSiteId}
              options={siteOptions}
              searchPlaceholder='Search sites…'
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
              {isFiltered
                ? `${shownTotal.toLocaleString("en-IN")} of ${plural(counts[ALL])}`
                : plural(counts[ALL])}
            </p>
          </FilterBar>

          {uploads.length === 0 ? (
            <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-500'>
              No uploads match these filters.
            </p>
          ) : (
            <ScrollArea className='h-[min(460px,55vh)] pr-3'>
              <ul className='divide-y divide-gray-100 rounded-lg border border-gray-200'>
                {uploads.map((row) => (
                  <UploadItem
                    key={row.id}
                    row={row}
                  />
                ))}
              </ul>
              {lastPage?.pagination.hasMore && (
                <LoadMoreBtn
                  onClick={loadMore}
                  loading={isFetchingMore}
                  className='pt-3 pb-1'
                />
              )}
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
