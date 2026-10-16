"use client";
import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import {
  toDocuments,
  toStoredDocument,
  type StoredDocument,
} from "@/lib/documents";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import {
  Plus,
  Save,
  Paperclip,
  AlertTriangle,
  HardHat,
  ReceiptIndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { capitalFirstLetter } from "@pkg/utils";
import { cn } from "@/lib/utils";

export interface ActivityOption {
  key: string;
  label: string;
  unit: string | null;
  estimateQty: number | null;
}

export interface Expense {
  id: number;
  contractor_id: number | null;
  contractor_name: string | null;
  activity_key: string | null;
  quantity: string | null;
  is_exceeded: number | boolean | null;
  description: string;
  amount: string;
  start_date: string | Date;
  end_date: string | Date;
  invoice_number: string | null;
  documents: StoredDocument[] | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  workOrderSiteId: number;
  editingExpense?: Expense | null;
  activities?: ActivityOption[];
  usedQtyByActivity?: Record<string, number>;
  // The vendors the site's work is ordered to, for a site that keeps its own;
  // an expense is recorded under one of them. Without them any active vendor
  // can be picked.
  contractors?: { id: number; name: string }[];
  // The contractor a new expense starts under.
  defaultContractorId?: number | null;
}

// "Expense under" value for an expense under none of the contractors.
const NOT_UNDER = "none";

const toDateInput = (value: string | Date = new Date()) =>
  format(new Date(value), "yyyy-MM-dd");

const formatQty = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

const AddExpenseDialog = ({
  open,
  onClose,
  onSuccess,
  workOrderSiteId,
  editingExpense,
  activities = [],
  usedQtyByActivity = {},
  contractors,
  defaultContractorId = null,
}: Props) => {
  const utils = trpc.useUtils();

  const [amount, setAmount] = useState("");

  const siteVendors = contractors ?? [];
  const picksAnyVendor = contractors === undefined;
  // The vendor picked from all vendors, when the site keeps none of its own.
  const [contractorId, setContractorId] = useState<string>("");
  // A contractor id, NOT_UNDER, or "" until chosen.
  const [underId, setUnderId] = useState("");
  const [selectedActivityKey, setSelectedActivityKey] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() => toDateInput());
  const [endDate, setEndDate] = useState(() => toDateInput());
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  // Saved documents in edit mode. Removing one only detaches it: expenses
  // recorded together share the same files.
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);

  const [showAddContractor, setShowAddContractor] = useState(false);
  const [newContractorName, setNewContractorName] = useState("");
  const [newContractorContact, setNewContractorContact] = useState("");
  const [newContractorGst, setNewContractorGst] = useState("");

  const isEditing = !!editingExpense;
  const underContractor =
    siteVendors.find((c) => String(c.id) === underId) ?? null;
  const expenseContractorId = underContractor
    ? underContractor.id
    : picksAnyVendor && contractorId
      ? Number(contractorId)
      : null;

  const sharePointUpload = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${workOrderSiteId}/Expenses`,
    conflictBehavior: "rename",
  });

  const resetDocumentState = useCallback(() => {
    setFiles([]);
    setSavedDocuments([]);
    sharePointUpload.reset();
  }, [sharePointUpload]);

  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount);
      setContractorId(editingExpense.contractor_id ? String(editingExpense.contractor_id) : "");
      const under = siteVendors.find(
        (c) => c.id === editingExpense.contractor_id,
      );
      setUnderId(
        under ? String(under.id) : siteVendors.length > 0 ? NOT_UNDER : "",
      );
      setSelectedActivityKey(editingExpense.activity_key ?? "");
      setQuantity(editingExpense.quantity ?? "");
      setDescription(editingExpense.description);
      setStartDate(toDateInput(editingExpense.start_date));
      setEndDate(toDateInput(editingExpense.end_date));
      setInvoiceNumber(editingExpense.invoice_number ?? "");
      setSavedDocuments(toDocuments(editingExpense.documents));
      setFiles([]);
    } else {
      setAmount("");
      setContractorId("");
      // With one contractor it is the likely choice; with several, ask.
      setUnderId(
        defaultContractorId
          ? String(defaultContractorId)
          : siteVendors.length === 1
            ? String(siteVendors[0]!.id)
            : "",
      );
      setSelectedActivityKey("");
      setQuantity("");
      setDescription("");
      setStartDate(toDateInput());
      setEndDate(toDateInput());
      setInvoiceNumber("");
      resetDocumentState();
    }
    setShowAddContractor(false);
    setNewContractorName("");
    setNewContractorContact("");
    setNewContractorGst("");
  }, [editingExpense, open]);

  const selectedActivity = activities.find((a) => a.key === selectedActivityKey);
  const estimateQty = selectedActivity?.estimateQty ?? null;
  const alreadyUsedQty = (() => {
    if (!selectedActivityKey) return 0;
    const total = usedQtyByActivity[selectedActivityKey] ?? 0;
    if (isEditing && editingExpense?.activity_key === selectedActivityKey && editingExpense?.quantity) {
      return Math.max(0, total - Number(editingExpense.quantity));
    }
    return total;
  })();
  const remainingQty = estimateQty !== null ? Math.max(0, estimateQty - alreadyUsedQty) : null;
  const isQuotaExhausted = remainingQty !== null && remainingQty <= 0;
  const isExceededMode = !!selectedActivityKey && isQuotaExhausted;
  const enteredQty = quantity ? parseFloat(quantity) : 0;
  const qtyExceedsRemaining =
    !isExceededMode && !!selectedActivityKey && !!quantity &&
    remainingQty !== null && enteredQty > remainingQty;
  const showQuantity = !!selectedActivityKey && !isExceededMode;
  const qtyUnit = selectedActivity?.unit ?? "Nos";

  const contractorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: open && picksAnyVendor },
  );
  // Inactive vendors can't take new expenses, but an edit keeps its own.
  const vendors = (contractorsQuery.data?.contractors ?? []).filter(
    (c: any) => c.status === "active" || String(c.id) === contractorId,
  );

  const createContractorMutation = trpc.contractorMutation.createContractor.useMutation({
    onSuccess: (data: any) => {
      utils.contractorQuery.invalidate();
      setContractorId(String(data.id));
      setShowAddContractor(false);
      setNewContractorName("");
      setNewContractorContact("");
      setNewContractorGst("");
      toast.success("Contractor added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add contractor"),
  });

  const handleSaved = (message: string) => {
    utils.expenseQuery.getExpenses.invalidate({ work_order_site_id: workOrderSiteId });
    utils.expenseQuery.getExpenseSummary.invalidate({ work_order_site_id: workOrderSiteId });
    toast.success(message);
    onSuccess?.();
    onClose();
  };

  const createExpenseMutation = trpc.expenseMutation.createExpense.useMutation({
    onSuccess: () =>
      handleSaved(isExceededMode ? "Exceeded expense recorded" : "Expense recorded"),
    onError: (e: any) => toast.error(e.message || "Failed to record expense"),
  });
  const updateExpenseMutation = trpc.expenseMutation.updateExpense.useMutation({
    onSuccess: () => handleSaved("Expense updated"),
    onError: (e: any) => toast.error(e.message || "Failed to update expense"),
  });

  const handleAddContractor = () => {
    if (!newContractorName.trim()) {
      toast.error("Contractor name is required");
      return;
    }
    createContractorMutation.mutate({
      name: newContractorName.trim(),
      contact_number: newContractorContact.trim() || undefined,
      gst_number: newContractorGst.trim() || undefined,
    });
  };

  const handleSubmit = async () => {
    if (siteVendors.length > 0 && !underId) {
      toast.error("Choose which vendor this expense is under");
      return;
    }
    if (activities.length > 0 && !selectedActivityKey) {
      toast.error("Please select an activity");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!description.trim()) { toast.error("Description is required"); return; }
    if (!startDate || !endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date can't be before the start date");
      return;
    }

    if (selectedActivityKey && !isExceededMode && quantity) {
      const q = parseFloat(quantity);
      if (isNaN(q) || q < 0) { toast.error("Quantity must be a positive number"); return; }
      if (remainingQty !== null && q > remainingQty) {
        toast.error(`Only ${formatQty(remainingQty)} ${qtyUnit} left on this activity`);
        return;
      }
    }

    const uploaded = await sharePointUpload.uploadFiles(files);
    if (!uploaded) return;
    const documents = [...savedDocuments, ...uploaded.map(toStoredDocument)];

    const payload = {
      contractor_id: expenseContractorId,
      activity_key: selectedActivityKey || null,
      quantity: selectedActivityKey && quantity ? quantity : null,
      is_exceeded: isExceededMode,
      description: description.trim(),
      amount,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      invoice_number: invoiceNumber.trim() || null,
      documents,
    };

    if (isEditing && editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, ...payload });
      return;
    }

    createExpenseMutation.mutate({
      work_order_site_id: workOrderSiteId,
      ...payload,
    });
  };

  const isUploadingDoc = sharePointUpload.isUploading;
  const isSaving =
    createExpenseMutation.isPending ||
    updateExpenseMutation.isPending ||
    isUploadingDoc;

  // One "Expense under" choice, drawn as a radio row.
  const renderUnderOption = ({
    value,
    label,
    Icon,
    hint,
    bordered = false,
  }: {
    value: string;
    label: string;
    Icon: React.ElementType;
    hint?: string;
    bordered?: boolean;
  }) => {
    const checked = underId === value;
    return (
      <button
        key={value}
        type='button'
        role='radio'
        aria-checked={checked}
        onClick={() => setUnderId(value)}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
          checked
            ? "bg-blue-50 font-medium text-blue-700"
            : "text-gray-700 hover:bg-gray-50",
          bordered &&
            cn("rounded-lg border", checked ? "border-blue-200" : "border-gray-200"),
        )}>
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            checked ? "border-blue-600" : "border-gray-300",
          )}>
          {checked && <span className='size-2 rounded-full bg-blue-600' />}
        </span>
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            checked ? "text-blue-600" : "text-gray-400",
          )}
        />
        <span className='truncate'>{label}</span>
        {hint && (
          <span className='ml-auto shrink-0 text-xs font-normal text-gray-400'>
            {hint}
          </span>
        )}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='w-full sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden max-h-[92dvh]'>

        <DialogHeader
          className={`shrink-0 px-6 pt-5 pb-4 border-b ${isExceededMode ? "bg-orange-50" : ""}`}>
          <DialogTitle
            className={`text-base font-semibold flex items-center gap-2 ${isExceededMode ? "text-orange-700" : ""}`}>
            {isExceededMode && <AlertTriangle className='w-4 h-4 text-orange-600' />}
            {isEditing
              ? "Edit Expense"
              : isExceededMode
                ? "Record Exceeded Expense"
                : "Record Expense"}
          </DialogTitle>
          <DialogDescription className='text-xs text-gray-500'>
            {isExceededMode
              ? "This activity's estimated quantity is fully used. Will be recorded as exceeded."
              : isEditing
                ? "Update the expense details below."
                : "Record an amount spent on this site."}
          </DialogDescription>
        </DialogHeader>

        {isExceededMode && (
          <div className='shrink-0 mx-6 mt-4 flex items-start gap-2.5 rounded-lg bg-orange-50 border border-orange-200 px-3.5 py-3'>
            <AlertTriangle className='w-4 h-4 text-orange-500 shrink-0 mt-0.5' />
            <div>
              <p className='text-xs font-semibold text-orange-700'>
                Exceeded — {selectedActivity?.label}
              </p>
              <p className='text-[10px] text-orange-600 mt-0.5'>
                Est: {estimateQty} {selectedActivity?.unit ?? "Nos"} · Fully used ({alreadyUsedQty}).
                Recording as over-budget.
              </p>
            </div>
          </div>
        )}

        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0'>

          {siteVendors.length > 0 && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                Expense under <span className='text-red-500'>*</span>
              </Label>
              <div
                role='radiogroup'
                aria-label='Expense under'
                className='space-y-2'>
                {/* Two columns that scroll inside a fixed height, however
                    many vendors there are. */}
                <div className='grid max-h-40 grid-cols-1 gap-0.5 overflow-y-auto rounded-lg border border-gray-200 p-1 sm:grid-cols-2'>
                  {siteVendors.map((c) =>
                    renderUnderOption({
                      value: String(c.id),
                      label: capitalFirstLetter(c.name),
                      Icon: HardHat,
                    }),
                  )}
                </div>
                <div className='sm:w-1/2'>
                  {renderUnderOption({
                    value: NOT_UNDER,
                    label: "Miscellaneous",
                    Icon: ReceiptIndianRupee,
                    hint: "Not under a vendor",
                    bordered: true,
                  })}
                </div>
              </div>
            </div>
          )}

          {activities.length > 0 && (
            <div className='space-y-1.5'>
              <div
                className={cn(
                  "grid grid-cols-1 gap-3",
                  showQuantity && "sm:grid-cols-[1fr_11rem]",
                )}>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-gray-700'>
                    Activity <span className='text-red-500'>*</span>
                  </Label>
                  <Select
                    value={selectedActivityKey}
                    onValueChange={(v) => {
                      setSelectedActivityKey(v);
                      setQuantity("");
                    }}>
                    <SelectTrigger className='h-9 w-full text-sm'>
                      <SelectValue placeholder='Select activity this expense belongs to...' />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map((a) => (
                        <SelectItem key={a.key} value={a.key} className='text-sm'>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showQuantity && (
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-gray-700'>
                      Quantity <span className='text-gray-400'>(optional)</span>
                    </Label>
                    <div className='relative'>
                      <Input
                        type='number' min='0' step='0.01' placeholder='0.00'
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        aria-invalid={qtyExceedsRemaining || undefined}
                        className='h-9 pr-12 text-sm'
                      />
                      <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                        {qtyUnit}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* A quantity is used up from the activity's estimate. */}
              {showQuantity && remainingQty !== null && estimateQty !== null && (
                <p
                  className={cn(
                    "text-xs",
                    qtyExceedsRemaining ? "text-red-600" : "text-gray-500",
                  )}>
                  {qtyExceedsRemaining
                    ? `Only ${formatQty(remainingQty)} ${qtyUnit} left on this activity.`
                    : enteredQty > 0
                      ? `${formatQty(remainingQty - enteredQty)} of ${formatQty(estimateQty)} ${qtyUnit} will be left on this activity.`
                      : `${formatQty(remainingQty)} of ${formatQty(estimateQty)} ${qtyUnit} left on this activity.`}
                </p>
              )}
            </div>
          )}

          {picksAnyVendor && (
            <div className='space-y-2 border border-blue-100 rounded-lg p-3 bg-blue-50/30'>
              <Label className='text-xs font-medium text-gray-700 flex items-center gap-1.5'>
                <HardHat className='w-3 h-3 text-blue-500' />
                Vendor <span className='text-gray-400 font-normal'>(optional)</span>
              </Label>
              {!showAddContractor ? (
                <div className='flex gap-2'>
                  <Select value={contractorId} onValueChange={setContractorId}>
                    <SelectTrigger className='h-9 text-sm flex-1 bg-white'>
                      <SelectValue placeholder='Select contractor...' />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.length === 0 && (
                        <div className='px-3 py-2 text-xs text-gray-400'>No contractors yet</div>
                      )}
                      {vendors.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)} className='text-sm'>
                          {c.name}
                          {c.gst_number && <span className='text-gray-400 ml-1'>· {c.gst_number}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type='button'
                    onClick={() => setShowAddContractor(true)}
                    className='flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap px-2 py-1.5 border border-blue-200 rounded-md bg-white hover:bg-blue-50 transition-colors'>
                    <Plus className='w-3 h-3' />
                    New
                  </button>
                </div>
              ) : (
                <div className='space-y-2'>
                  <Input
                    placeholder='Contractor name *' value={newContractorName}
                    onChange={(e) => setNewContractorName(e.target.value)}
                    className='h-9 text-sm bg-white'
                  />
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    <Input
                      placeholder='Contact number' value={newContractorContact}
                      onChange={(e) => setNewContractorContact(e.target.value)}
                      className='h-9 text-sm bg-white'
                    />
                    <Input
                      placeholder='GST number' value={newContractorGst}
                      onChange={(e) => setNewContractorGst(e.target.value)}
                      className='h-9 text-sm bg-white'
                    />
                  </div>
                  <div className='flex gap-2'>
                    <CustomButton
                      text='Add Contractor' variant='primary'
                      onClick={handleAddContractor}
                      loading={createContractorMutation.isPending}
                      disabled={createContractorMutation.isPending}
                      className='h-8 text-xs flex-1'
                      disableForViewer
                    />
                    <button
                      type='button' onClick={() => setShowAddContractor(false)}
                      className='text-xs text-gray-500 hover:text-gray-700 px-3 border rounded-md bg-white'>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className='space-y-1.5'>
            <Label className='text-xs font-medium text-gray-700'>
              Description <span className='text-red-500'>*</span>
            </Label>
            <Input
              placeholder='e.g. Excavation work, Labour charges...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='h-9 text-sm'
            />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                Amount <span className='text-red-500'>*</span>
              </Label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>₹</span>
                <Input
                  type='number' min='0' step='0.01' placeholder='0.00'
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className='h-9 pl-7 text-sm'
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                Invoice # <span className='text-gray-400'>(optional)</span>
              </Label>
              <Input
                placeholder='e.g. INV-001' value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className='h-9 text-sm'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                Start date <span className='text-red-500'>*</span>
              </Label>
              <Input
                type='date' value={startDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setStartDate(next);
                  // A later start takes the end with it, so the range stays valid.
                  if (next && endDate < next) setEndDate(next);
                }}
                className='h-9 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                End date <span className='text-red-500'>*</span>
              </Label>
              <Input
                type='date' value={endDate} min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className='h-9 text-sm'
              />
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label className='text-xs font-medium text-gray-700 flex items-center gap-1.5'>
              <Paperclip className='w-3 h-3 text-gray-400' />
              Supporting Documents <span className='text-gray-400'>(optional)</span>
            </Label>
            <DocumentsField
              label='Attach invoices, bills, or receipts'
              files={files}
              onFilesChange={setFiles}
              existing={savedDocuments}
              onRemoveExisting={(index) =>
                setSavedDocuments((prev) => prev.filter((_, i) => i !== index))
              }
              isUploading={isUploadingDoc}
              progress={sharePointUpload.progress}
            />
          </div>
        </div>

        <div className={`shrink-0 flex gap-2 px-6 py-4 border-t ${isExceededMode ? "bg-orange-50/60" : "bg-white"}`}>
          <CustomButton
            text={
              isUploadingDoc
                ? `Uploading… ${sharePointUpload.progress}%`
                : isEditing
                  ? "Save Changes"
                  : isExceededMode
                    ? "Record Exceeded Expense"
                    : "Record Expense"
            }
            variant='primary'
            Icon={Save}
            onClick={handleSubmit}
            loading={isSaving}
            disabled={isSaving}
            className={`flex-1 h-9 text-sm ${isExceededMode ? "bg-orange-600 hover:bg-orange-700 border-orange-600" : ""}`}
          />
          <button
            type='button' onClick={onClose} disabled={isSaving}
            className='px-4 py-2 text-sm border rounded-md text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50'>
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseDialog;
