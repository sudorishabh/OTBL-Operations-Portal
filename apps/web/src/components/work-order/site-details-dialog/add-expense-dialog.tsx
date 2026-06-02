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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CustomButton from "@/components/shared/btn";
import DeferredFilePicker from "@/components/shared/deferred-file-picker";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import {
  Plus,
  Save,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  X,
  HardHat,
  Users,
  Package,
  Wrench,
  MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  contractor_payment: "Contractor Payment",
  labour: "Labour",
  material: "Material",
  equipment: "Equipment",
  miscellaneous: "Miscellaneous",
};

const EXPENSE_TYPE_ICONS: Record<string, React.ElementType> = {
  contractor_payment: HardHat,
  labour: Users,
  material: Package,
  equipment: Wrench,
  miscellaneous: MoreHorizontal,
};

const EXPENSE_TYPE_COLORS: Record<string, string> = {
  contractor_payment: "text-blue-600 bg-blue-50 border-blue-200",
  labour: "text-orange-600 bg-orange-50 border-orange-200",
  material: "text-purple-600 bg-purple-50 border-purple-200",
  equipment: "text-cyan-600 bg-cyan-50 border-cyan-200",
  miscellaneous: "text-gray-600 bg-gray-50 border-gray-200",
};

type ExpenseType =
  | "contractor_payment"
  | "labour"
  | "material"
  | "equipment"
  | "miscellaneous";

// Sentinel for rows where the user hasn't picked a category. Saved to the
// backend as "miscellaneous" (the catch-all type) so an expense can be
// recorded with just an amount, without forcing a type choice.
const NO_TYPE = "__none__" as const;

type ExpenseTypeSelection = ExpenseType | typeof NO_TYPE;

const resolveExpenseType = (t: ExpenseTypeSelection): ExpenseType =>
  t === NO_TYPE ? "miscellaneous" : t;

type ExpenseItem = {
  id: string;
  expense_type: ExpenseTypeSelection;
  amount: string;
};

export interface ActivityOption {
  key: string;
  label: string;
  unit: string | null;
  estimateQty: number | null;
}

export interface Expense {
  id: number;
  expense_type: string;
  contractor_id: number | null;
  contractor_name: string | null;
  activity_key: string | null;
  quantity: string | null;
  is_exceeded: number | boolean | null;
  description: string;
  amount: string;
  expense_date: string | Date;
  invoice_number: string | null;
  notes: string | null;
  document_url: string | null;
  document_id: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  workOrderSiteId: number;
  officeId: number;
  editingExpense?: Expense | null;
  activities?: ActivityOption[];
  usedQtyByActivity?: Record<string, number>;
}

const newItem = (): ExpenseItem => ({
  id: Math.random().toString(36).slice(2),
  expense_type: NO_TYPE,
  amount: "",
});

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);

const AddExpenseDialog = ({
  open,
  onClose,
  onSuccess,
  workOrderSiteId,
  officeId,
  editingExpense,
  activities = [],
  usedQtyByActivity = {},
}: Props) => {
  const utils = trpc.useUtils();

  // Multiple type+amount rows (single row when editing)
  const [items, setItems] = useState<ExpenseItem[]>([newItem()]);

  // Shared fields
  const [contractorId, setContractorId] = useState<string>("");
  const [selectedActivityKey, setSelectedActivityKey] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);

  const [showAddContractor, setShowAddContractor] = useState(false);
  const [newContractorName, setNewContractorName] = useState("");
  const [newContractorContact, setNewContractorContact] = useState("");
  const [newContractorGst, setNewContractorGst] = useState("");

  const [isSavingMulti, setIsSavingMulti] = useState(false);

  const isEditing = !!editingExpense;
  const hasContractorPayment = items.some((i) => i.expense_type === "contractor_payment");

  const sharePointUpload = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${workOrderSiteId}/Expenses`,
  });

  const resetDocumentState = useCallback(() => {
    setSelectedFile(null);
    setUploadedDocUrl(null);
    setUploadedDocId(null);
    sharePointUpload.reset();
  }, [sharePointUpload]);

  useEffect(() => {
    if (editingExpense) {
      setItems([{
        id: String(editingExpense.id),
        expense_type: editingExpense.expense_type as ExpenseType,
        amount: editingExpense.amount,
      }]);
      setContractorId(editingExpense.contractor_id ? String(editingExpense.contractor_id) : "");
      setSelectedActivityKey(editingExpense.activity_key ?? "");
      setQuantity(editingExpense.quantity ?? "");
      setDescription(editingExpense.description);
      setExpenseDate(format(new Date(editingExpense.expense_date), "yyyy-MM-dd"));
      setInvoiceNumber(editingExpense.invoice_number ?? "");
      setNotes(editingExpense.notes ?? "");
      setUploadedDocUrl(editingExpense.document_url ?? null);
      setUploadedDocId(editingExpense.document_id ?? null);
      setSelectedFile(null);
    } else {
      setItems([newItem()]);
      setContractorId("");
      setSelectedActivityKey("");
      setQuantity("");
      setDescription("");
      setExpenseDate(format(new Date(), "yyyy-MM-dd"));
      setInvoiceNumber("");
      setNotes("");
      resetDocumentState();
    }
    setShowAddContractor(false);
    setNewContractorName("");
    setNewContractorContact("");
    setNewContractorGst("");
  }, [editingExpense, open]);

  // Activity/quota logic
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
  const pctUsed = estimateQty && estimateQty > 0
    ? Math.min(100, (alreadyUsedQty / estimateQty) * 100)
    : 0;

  // Items helpers
  const updateItem = (id: string, field: keyof ExpenseItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  };

  const totalAmount = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  // Contractors
  const contractorsQuery = trpc.contractorQuery.getContractors.useQuery(
    { office_id: officeId },
    { enabled: open && !!officeId },
  );
  const contractors = contractorsQuery.data?.contractors ?? [];

  const createContractorMutation = trpc.contractorMutation.createContractor.useMutation({
    onSuccess: (data: any) => {
      utils.contractorQuery.getContractors.invalidate({ office_id: officeId });
      setContractorId(String(data.id));
      setShowAddContractor(false);
      setNewContractorName("");
      setNewContractorContact("");
      setNewContractorGst("");
      toast.success("Contractor added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add contractor"),
  });

  const createExpenseMutation = trpc.expenseMutation.createExpense.useMutation();
  const updateExpenseMutation = trpc.expenseMutation.updateExpense.useMutation({
    onSuccess: () => {
      utils.expenseQuery.getExpenses.invalidate({ work_order_site_id: workOrderSiteId });
      utils.expenseQuery.getExpenseSummary.invalidate({ work_order_site_id: workOrderSiteId });
      toast.success("Expense updated");
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update expense"),
  });

  const handleAddContractor = () => {
    if (!newContractorName.trim()) {
      toast.error("Contractor name is required");
      return;
    }
    createContractorMutation.mutate({
      office_id: officeId,
      name: newContractorName.trim(),
      contact_number: newContractorContact.trim() || undefined,
      gst_number: newContractorGst.trim() || undefined,
    });
  };

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    if (file) { setUploadedDocUrl(null); setUploadedDocId(null); }
  }, []);

  const handleDeleteUploadedDoc = useCallback(async () => {
    if (uploadedDocId) await sharePointUpload.deleteFile(uploadedDocId);
    setUploadedDocUrl(null);
    setUploadedDocId(null);
    setSelectedFile(null);
  }, [uploadedDocId, sharePointUpload]);

  const handleSubmit = async () => {
    // Validate shared fields
    if (activities.length > 0 && !selectedActivityKey) {
      toast.error("Please select an activity");
      return;
    }
    if (!description.trim()) { toast.error("Description is required"); return; }
    if (!expenseDate) { toast.error("Date is required"); return; }

    // Validate items
    for (const item of items) {
      if (!item.amount || isNaN(parseFloat(item.amount)) || parseFloat(item.amount) <= 0) {
        const typeLabel =
          item.expense_type === NO_TYPE
            ? "this expense"
            : EXPENSE_TYPE_LABELS[item.expense_type];
        toast.error(`Enter a valid amount for ${typeLabel}`);
        return;
      }
    }

    // Qty validation
    if (selectedActivityKey && !isExceededMode && quantity) {
      const q = parseFloat(quantity);
      if (isNaN(q) || q < 0) { toast.error("Quantity must be a positive number"); return; }
      if (remainingQty !== null && q > remainingQty) {
        toast.error(`Quantity cannot exceed the remaining ${remainingQty} for this activity`);
        return;
      }
    }

    // Upload shared document once
    let docUrl = uploadedDocUrl;
    let docId = uploadedDocId;
    if (selectedFile) {
      const result = await sharePointUpload.uploadFile(selectedFile);
      if (!result) return;
      docUrl = result.webUrl;
      docId = result.id;
    }

    const sharedPayload = {
      activity_key: selectedActivityKey || null,
      quantity: selectedActivityKey && quantity ? quantity : null,
      is_exceeded: isExceededMode,
      description: description.trim(),
      expense_date: new Date(expenseDate).toISOString(),
      invoice_number: invoiceNumber.trim() || null,
      notes: notes.trim() || null,
      document_url: docUrl ?? null,
      document_id: docId ?? null,
    };

    if (isEditing && editingExpense) {
      const item = items[0]!;
      updateExpenseMutation.mutate({
        id: editingExpense.id,
        expense_type: resolveExpenseType(item.expense_type),
        contractor_id:
          item.expense_type === "contractor_payment" && contractorId
            ? Number(contractorId)
            : null,
        amount: item.amount,
        ...sharedPayload,
      });
      return;
    }

    // Create one expense per type row
    setIsSavingMulti(true);
    try {
      await Promise.all(
        items.map((item) =>
          createExpenseMutation.mutateAsync({
            work_order_site_id: workOrderSiteId,
            expense_type: resolveExpenseType(item.expense_type),
            contractor_id:
              item.expense_type === "contractor_payment" && contractorId
                ? Number(contractorId)
                : null,
            amount: item.amount,
            ...sharedPayload,
          }),
        ),
      );
      toast.success(
        items.length > 1
          ? `${items.length} expense entries recorded`
          : isExceededMode
            ? "Exceeded expense recorded"
            : "Expense recorded",
      );
      onSuccess?.();
      onClose();
      utils.expenseQuery.getExpenses.invalidate({ work_order_site_id: workOrderSiteId });
      utils.expenseQuery.getExpenseSummary.invalidate({ work_order_site_id: workOrderSiteId });
    } catch (e: any) {
      toast.error(e.message || "Failed to save expenses");
    } finally {
      setIsSavingMulti(false);
    }
  };

  const isUploadingDoc = sharePointUpload.isUploading;
  const isSaving =
    isSavingMulti ||
    updateExpenseMutation.isPending ||
    isUploadingDoc;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='max-w-lg w-full flex flex-col gap-0 p-0 overflow-hidden max-h-[92dvh]'>

        {/* Header */}
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
                : "Enter an amount and save — choosing an expense type is optional."}
          </DialogDescription>
        </DialogHeader>

        {/* Exceeded banner */}
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

        {/* Scrollable body */}
        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0'>

          {/* Activity Selector */}
          {activities.length > 0 && (
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
                <SelectTrigger className='h-9 text-sm'>
                  <SelectValue placeholder='Select activity this expense belongs to...' />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((a) => {
                    return (
                      <SelectItem key={a.key} value={a.key} className='text-sm'>
                        {a.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity (normal linked expenses only) */}
          {selectedActivityKey && !isExceededMode && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                Quantity <span className='text-gray-400'>(optional)</span>
              </Label>
              <Input
                type='number' min='0' step='0.01' placeholder='0.00'
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className='h-9 text-sm'
              />
            </div>
          )}

          {/* ─── Expense Type Rows ─── */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-medium text-gray-700'>
                Amount <span className='text-red-500'>*</span>
                <span className='text-gray-400 font-normal'> · type optional</span>
              </Label>
              {totalAmount > 0 && (
                <span className='text-xs font-semibold text-gray-700'>
                  Total: {formatCurrency(totalAmount)}
                </span>
              )}
            </div>

            <div className='rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100'>
              {items.map((item, idx) => {
                const TypeIcon = EXPENSE_TYPE_ICONS[item.expense_type] ?? MoreHorizontal;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-3 py-2.5 ${EXPENSE_TYPE_COLORS[item.expense_type] ?? "bg-gray-50"} bg-opacity-30`}>
                    {/* Type icon */}
                    <div className={`flex items-center justify-center w-7 h-7 rounded-md border shrink-0 ${EXPENSE_TYPE_COLORS[item.expense_type] ?? ""}`}>
                      <TypeIcon className='w-3.5 h-3.5' />
                    </div>

                    {/* Type select */}
                    <Select
                      value={item.expense_type}
                      onValueChange={(v) => {
                        updateItem(item.id, "expense_type", v);
                        if (v !== "contractor_payment") setContractorId("");
                      }}>
                      <SelectTrigger className='h-8 text-xs flex-1 min-w-0 bg-white border-gray-200'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TYPE} className='text-sm text-gray-500'>
                          No specific type
                        </SelectItem>
                        {Object.entries(EXPENSE_TYPE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val} className='text-sm'>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Amount */}
                    <div className='relative shrink-0 w-32'>
                      <span className='absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400'>₹</span>
                      <Input
                        type='number' min='0' step='0.01' placeholder='0.00'
                        value={item.amount}
                        onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                        className='h-8 text-xs pl-6 bg-white border-gray-200'
                      />
                    </div>

                    {/* Remove row */}
                    {!isEditing && (
                      <button
                        type='button'
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className='shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed'>
                        <X className='w-3.5 h-3.5' />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add another type row */}
            {!isEditing && (
              <button
                type='button'
                onClick={() => setItems((prev) => [...prev, newItem()])}
                className='flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-1 py-1 rounded hover:bg-blue-50 transition-colors'>
                <Plus className='w-3.5 h-3.5' />
                Add another expense
              </button>
            )}

            {/* Total row when multiple items */}
            {items.length > 1 && (
              <div className='flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs'>
                <span className='text-gray-500 font-medium'>
                  {items.length} expense types
                </span>
                <span className='font-bold text-gray-800'>{formatCurrency(totalAmount)}</span>
              </div>
            )}
          </div>

          {/* Contractor section — shown when any row is contractor_payment */}
          {hasContractorPayment && (
            <div className='space-y-2 border border-blue-100 rounded-lg p-3 bg-blue-50/30'>
              <Label className='text-xs font-medium text-gray-700 flex items-center gap-1.5'>
                <HardHat className='w-3 h-3 text-blue-500' />
                Contractor
              </Label>
              {!showAddContractor ? (
                <div className='flex gap-2'>
                  <Select value={contractorId} onValueChange={setContractorId}>
                    <SelectTrigger className='h-9 text-sm flex-1 bg-white'>
                      <SelectValue placeholder='Select contractor...' />
                    </SelectTrigger>
                    <SelectContent>
                      {contractors.length === 0 && (
                        <div className='px-3 py-2 text-xs text-gray-400'>No contractors yet</div>
                      )}
                      {contractors.map((c: any) => (
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

          {/* Description */}
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

          {/* Date + Invoice */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                Date <span className='text-red-500'>*</span>
              </Label>
              <Input
                type='date' value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className='h-9 text-sm'
              />
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

          {/* Notes */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium text-gray-700'>
              Notes <span className='text-gray-400'>(optional)</span>
            </Label>
            <Textarea
              placeholder='Any additional notes...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='text-sm resize-none h-16'
            />
          </div>

          {/* Document Upload */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium text-gray-700 flex items-center gap-1.5'>
              <Paperclip className='w-3 h-3 text-gray-400' />
              Supporting Document <span className='text-gray-400'>(optional)</span>
            </Label>
            <DeferredFilePicker
              label='Attach invoice, bill, or receipt'
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              isUploading={isUploadingDoc}
              uploadProgress={sharePointUpload.progress}
              isUploaded={!!uploadedDocUrl}
              uploadedUrl={uploadedDocUrl ?? undefined}
              onDelete={handleDeleteUploadedDoc}
              isDeleting={sharePointUpload.isDeleting}
              isUploadBgWhite={true}
              allowedExtensions={[".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"]}
              helperText='PDF, Word, Excel or image — max 50 MB.'
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`shrink-0 flex gap-2 px-6 py-4 border-t ${isExceededMode ? "bg-orange-50/60" : "bg-white"}`}>
          <CustomButton
            text={
              isUploadingDoc
                ? `Uploading… ${sharePointUpload.progress}%`
                : isEditing
                  ? "Save Changes"
                  : items.length > 1
                    ? `Record ${items.length} Expenses`
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
