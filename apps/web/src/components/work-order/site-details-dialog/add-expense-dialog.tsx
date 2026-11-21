"use client";
import React, { useState, useEffect, useCallback, useId } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import DatePicker from "@/components/shared/date-picker";
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
  Check,
  HardHat,
  ReceiptIndianRupee,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { capitalFirstLetter } from "@pkg/utils";
import { cn } from "@/lib/utils";
import RecordCode from "@/components/shared/record-code";
import { rateLabel } from "../contract-orders/contract-order-display";
import ExpenseActivityLines, {
  formatQty,
  newActivityLine,
  remainingQuantity,
  type ActivityLine,
} from "./expense-activity-lines";
import ExpenseOrderItemLines, {
  emptyOrderItemLine,
  orderItemLineAmount,
  pickedOrderItemsTotal,
  type PickedOrderItems,
} from "./expense-order-item-lines";

export interface ActivityOption {
  key: string;
  label: string;
  unit: string | null;
  estimateQty: number | null;
}

// One of an order's requirements at the site, as an expense on the order
// can be spent on. A sub-contract's rate prices it from the quantity worked;
// with a single expense, that is the requirement's total.
export interface OrderItemOption {
  id: number;
  label: string;
  unitRate: number | null;
  unit: string;
  singleExpense: boolean;
  // A single-expense requirement that already has its one.
  isTaken: boolean;
}

export interface Expense {
  id: number;
  contractor_id: number | null;
  contractor_name: string | null;
  contract_order_item_id?: number | null;
  // Recorded by its purchase order rather than at the site.
  from_order?: number | boolean;
  job_order_id?: number | null;
  activity_key: string | null;
  quantity: string | null;
  is_exceeded: number | boolean | null;
  description: string | null;
  amount: string;
  start_date: string | Date;
  end_date: string | Date;
  invoice_number: string | null;
  documents: StoredDocument[] | null;
  created_by_name?: string | null;
  created_at?: string | Date;
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
  // an expense is recorded under one of them. Without them any vendor can be
  // picked.
  contractors?: { id: number; name: string }[];
  // The contractor a new expense starts under.
  defaultContractorId?: number | null;
  // A new expense starts as miscellaneous, under no vendor.
  startsMiscellaneous?: boolean;
  // The one activity every expense is recorded against, so none is picked:
  // bioremediation's oil zapper.
  fixedActivityKey?: string;
  // The contract order the expense is spent on, with its requirements at the
  // site, one of which is picked. Its vendors are then the order's, and it
  // can't be miscellaneous.
  order?: { label: string; items: OrderItemOption[] } | null;
  // The restoration job order the expense is spent on, likewise.
  jobOrder?: { id: number; label: string } | null;
  // Why the activities are the ones offered, shown under their list. An
  // expense must then be under one of them, even if there are none.
  activitiesNote?: string;
}

// "Expense under" value for an expense under none of the contractors.
const NOT_UNDER = "none";

const toDateInput = (value: string | Date = new Date()) =>
  format(new Date(value), "yyyy-MM-dd");

// A search box appears once a site has this many vendors.
const VENDOR_SEARCH_FROM = 7;

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

// "Sharma ext" -> "SE"; a single word gives its first two letters.
const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
};

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
  startsMiscellaneous = false,
  fixedActivityKey,
  order = null,
  jobOrder = null,
  activitiesNote,
}: Props) => {
  // What the expense is spent on, when it is on an order or job order.
  const spentOn = order ?? jobOrder;
  // A new expense on a single-expense sub-contract can be for several of its
  // requirements, each recorded as its one expense with its total.
  const takesSeveralItems =
    !!order &&
    !editingExpense &&
    order.items.some((item) => item.singleExpense);
  const [pickedItems, setPickedItems] = useState<PickedOrderItems>({});
  const pickedItemList = takesSeveralItems
    ? order.items.filter((item) => pickedItems[item.id])
    : [];
  const pickedItemsTotal = takesSeveralItems
    ? pickedOrderItemsTotal(order.items, pickedItems)
    : 0;
  // The order requirement picked, by id, when the expense is for one.
  const [orderItemId, setOrderItemId] = useState("");
  const orderItem = takesSeveralItems
    ? null
    : (order?.items.find((item) => String(item.id) === orderItemId) ?? null);
  // The rate that prices the expense from its quantity, on a rated
  // sub-contract requirement.
  const orderRate = orderItem?.unitRate ?? null;
  const orderUnit = orderItem?.unit ?? "Nos";
  // A job order's expenses are each for one day, so they take a single date.
  const isOneDay = !!jobOrder || editingExpense?.job_order_id != null;
  // A new job order expense can be for several of its activities, each
  // recorded as its own expense.
  const takesSeveralActivities = !!jobOrder && !editingExpense;
  const [lines, setLines] = useState<ActivityLine[]>(() => [
    newActivityLine(),
  ]);
  const utils = trpc.useUtils();

  const [amount, setAmount] = useState("");

  const siteVendors = contractors ?? [];
  const picksAnyVendor = contractors === undefined;
  // The vendor picked from all vendors, when the site keeps none of its own.
  const [contractorId, setContractorId] = useState<string>("");
  // A contractor id, NOT_UNDER, or "" until chosen.
  const [underId, setUnderId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const underGroupName = useId();
  const [selectedActivityKey, setSelectedActivityKey] = useState<string>("");
  const [isActivityPickerOpen, setIsActivityPickerOpen] = useState(false);
  const [quantity, setQuantity] = useState<string>("");
  const [description, setDescription] = useState("");
  const descriptionId = useId();
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
  // A miscellaneous expense, under none of the site's vendors, uses up no
  // activity quantity, so it takes none.
  const isMiscellaneous =
    !picksAnyVendor && (underId === NOT_UNDER || siteVendors.length === 0);

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
      // An older expense keeps the activity it was recorded against.
      setSelectedActivityKey(
        editingExpense.activity_key ?? fixedActivityKey ?? "",
      );
      setOrderItemId(
        editingExpense.contract_order_item_id
          ? String(editingExpense.contract_order_item_id)
          : "",
      );
      setQuantity(editingExpense.quantity ?? "");
      setDescription(editingExpense.description ?? "");
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
        startsMiscellaneous
          ? NOT_UNDER
          : defaultContractorId
            ? String(defaultContractorId)
            : siteVendors.length === 1
              ? String(siteVendors[0]!.id)
              : "",
      );
      setSelectedActivityKey(fixedActivityKey ?? "");
      // With one requirement left to spend on it is the choice; with
      // several, ask.
      const openItems = order?.items.filter((item) => !item.isTaken) ?? [];
      setOrderItemId(openItems.length === 1 ? String(openItems[0]!.id) : "");
      setPickedItems(
        openItems.length === 1
          ? { [openItems[0]!.id]: emptyOrderItemLine() }
          : {},
      );
      setQuantity("");
      setDescription("");
      setStartDate(toDateInput());
      setEndDate(toDateInput());
      setInvoiceNumber("");
      setLines([newActivityLine()]);
      resetDocumentState();
    }
    setShowAddContractor(false);
    setNewContractorName("");
    setNewContractorContact("");
    setNewContractorGst("");
    setVendorSearch("");
    setIsActivityPickerOpen(false);
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
  const canEnterQuantity = !!selectedActivityKey && !isMiscellaneous;
  // A rated requirement's expense costs its quantity at the rate.
  const pricedAmount =
    orderRate !== null && enteredQty > 0 ? enteredQty * orderRate : null;
  const qtyExceedsRemaining =
    !isExceededMode && canEnterQuantity && !!quantity &&
    remainingQty !== null && enteredQty > remainingQty;
  const qtyUnit = selectedActivity?.unit ?? "Nos";
  const fixedActivityLabel =
    activities.find((a) => a.key === fixedActivityKey)?.label ?? null;
  // What's left of the activity's quantity, or of the fixed activity's
  // estimate still to procure.
  const describeLeft = (amount: string, willBe = false) => {
    const left = willBe ? "will be left" : "left";
    return fixedActivityLabel
      ? `${amount} of the estimated ${fixedActivityLabel} ${left} to procure`
      : `${amount} ${left} on this activity`;
  };

  const contractorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: open && picksAnyVendor },
  );
  const vendors = contractorsQuery.data?.contractors ?? [];

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
    utils.expenseQuery.getVendorMonthlyExpenses.invalidate({ work_order_site_id: workOrderSiteId });
    // Using up the schedule of rates completes a restoration, or reopens it.
    // A bioremediation site's oil zapper stock changes with its expenses.
    utils.restorationQuery.getRestoration.invalidate();
    utils.workOrderSiteQuery.getWorkOrderSiteDetails.invalidate({ work_order_site_id: workOrderSiteId });
    utils.workOrderQuery.getWorkOrderDetails.invalidate();
    utils.workOrderSiteQuery.getOilZapperStock.invalidate({ work_order_site_id: workOrderSiteId });
    // A single-expense requirement takes no more once it has one.
    utils.contractOrderQuery.getSiteContractOrderItems.invalidate({ work_order_site_id: workOrderSiteId });
    utils.contractOrderQuery.getContractOrderDetails.invalidate();
    toast.success(message);
    onSuccess?.();
    onClose();
  };

  const createExpenseMutation = trpc.expenseMutation.createExpense.useMutation({
    onSuccess: () =>
      handleSaved(isExceededMode ? "Exceeded expense recorded" : "Expense recorded"),
    onError: (e: any) => toast.error(e.message || "Failed to record expense"),
  });
  const createJobOrderExpensesMutation =
    trpc.expenseMutation.createJobOrderExpenses.useMutation({
      onSuccess: (data: { ids: number[] }) =>
        handleSaved(
          data.ids.length > 1
            ? `${data.ids.length} expenses recorded`
            : "Expense recorded",
        ),
      onError: (e: any) => toast.error(e.message || "Failed to record expenses"),
    });
  const createOrderExpensesMutation =
    trpc.expenseMutation.createOrderExpenses.useMutation({
      onSuccess: (data: { ids: number[] }) =>
        handleSaved(
          data.ids.length > 1
            ? `${data.ids.length} expenses recorded`
            : "Expense recorded",
        ),
      onError: (e: any) => toast.error(e.message || "Failed to record expenses"),
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

  // What stops the activity lines being recorded, if anything.
  const linesProblem = () => {
    for (const line of lines) {
      const activity = activities.find((a) => a.key === line.activityKey);
      if (!activity) return "Choose the activity on each line";
      const lineAmount = parseFloat(line.amount);
      if (!Number.isFinite(lineAmount) || lineAmount <= 0) {
        return `Enter a valid amount for ${activity.label}`;
      }
      if (!line.quantity) continue;
      const lineQty = parseFloat(line.quantity);
      if (isNaN(lineQty) || lineQty < 0) {
        return `${activity.label}'s quantity must be a positive number`;
      }
      const left = remainingQuantity(activity, usedQtyByActivity);
      if (left !== null && left > 0 && lineQty > left) {
        return `Only ${formatQty(left)} ${activity.unit ?? "Nos"} left on ${activity.label}`;
      }
    }
    return null;
  };

  // What stops the picked requirements being recorded, if anything.
  const itemsProblem = () => {
    if (pickedItemList.length === 0) {
      return "Choose the items this expense is for";
    }
    if (!expenseContractorId) {
      return "Give the sub-contract its vendor first, to record expenses under it";
    }
    for (const item of pickedItemList) {
      if (orderItemLineAmount(item, pickedItems[item.id]!) === null) {
        return item.unitRate !== null
          ? `Enter ${item.label}'s total quantity, in ${item.unit}`
          : `Enter ${item.label}'s amount`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (order && !takesSeveralItems && !orderItem) {
      toast.error("Choose the item this expense is for");
      return;
    }
    if (siteVendors.length > 0 && !underId) {
      toast.error("Choose which vendor this expense is under");
      return;
    }
    if (takesSeveralActivities) {
      const problem = expenseContractorId
        ? linesProblem()
        : "Give the job order its vendors first, to record expenses under them";
      if (problem) {
        toast.error(problem);
        return;
      }
    } else if (takesSeveralItems) {
      const problem = itemsProblem();
      if (problem) {
        toast.error(problem);
        return;
      }
    } else {
      if ((activities.length > 0 || activitiesNote) && !selectedActivityKey) {
        toast.error("Please select an activity");
        return;
      }
      if (orderRate !== null) {
        if (pricedAmount === null) {
          toast.error(`Enter the quantity worked, in ${orderUnit}`);
          return;
        }
      } else {
        const parsedAmount = parseFloat(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          toast.error("Enter a valid amount");
          return;
        }
      }
    }
    const lastDate = isOneDay ? startDate : endDate;
    if (!startDate || !lastDate) {
      toast.error(
        isOneDay ? "Date is required" : "Start and end dates are required",
      );
      return;
    }
    if (lastDate < startDate) {
      toast.error("End date can't be before the start date");
      return;
    }

    if (canEnterQuantity && quantity) {
      const q = parseFloat(quantity);
      if (isNaN(q) || q < 0) { toast.error("Quantity must be a positive number"); return; }
      if (!isExceededMode && remainingQty !== null && q > remainingQty) {
        toast.error(`Only ${describeLeft(`${formatQty(remainingQty)} ${qtyUnit}`)}`);
        return;
      }
    }

    const uploaded = await sharePointUpload.uploadFiles(files);
    if (!uploaded) return;
    const documents = [...savedDocuments, ...uploaded.map(toStoredDocument)];

    if (takesSeveralActivities && jobOrder) {
      createJobOrderExpensesMutation.mutate({
        work_order_site_id: workOrderSiteId,
        job_order_id: jobOrder.id,
        contractor_id: expenseContractorId,
        description: description.trim() || null,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(lastDate).toISOString(),
        invoice_number: invoiceNumber.trim() || null,
        documents,
        lines: lines.map((line) => ({
          activity_key: line.activityKey,
          quantity: line.quantity || null,
          amount: line.amount,
          is_exceeded:
            remainingQuantity(
              activities.find((a) => a.key === line.activityKey),
              usedQtyByActivity,
            ) === 0,
        })),
      });
      return;
    }

    if (takesSeveralItems && expenseContractorId) {
      createOrderExpensesMutation.mutate({
        work_order_site_id: workOrderSiteId,
        contractor_id: expenseContractorId,
        description: description.trim() || null,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(lastDate).toISOString(),
        invoice_number: invoiceNumber.trim() || null,
        documents,
        // Priced again by the server from each requirement's rate.
        items: pickedItemList.map((item) => {
          const line = pickedItems[item.id]!;
          return {
            contract_order_item_id: item.id,
            quantity: item.unitRate !== null ? line.quantity : null,
            amount: orderItemLineAmount(item, line)!.toFixed(2),
          };
        }),
      });
      return;
    }

    const payload = {
      contractor_id: expenseContractorId,
      contract_order_item_id: orderItem?.id ?? null,
      job_order_id: jobOrder?.id ?? null,
      activity_key: selectedActivityKey || null,
      quantity:
        (canEnterQuantity || orderRate !== null) && quantity ? quantity : null,
      is_exceeded: isExceededMode,
      description: description.trim() || null,
      // Priced again by the server from the requirement's rate.
      amount: pricedAmount !== null ? pricedAmount.toFixed(2) : amount,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(lastDate).toISOString(),
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
    createJobOrderExpensesMutation.isPending ||
    createOrderExpensesMutation.isPending ||
    updateExpenseMutation.isPending ||
    isUploadingDoc;

  // A job order expense's one day.
  const singleDateField = (
    <div className='space-y-1.5'>
      <Label className='text-xs font-medium text-gray-700'>
        Date <span className='text-red-500'>*</span>
      </Label>
      <DatePicker
        value={startDate}
        onChange={setStartDate}
        aria-label='Date'
        className='h-9 text-sm'
      />
    </div>
  );

  const vendorQuery = vendorSearch.trim().toLowerCase();
  const shownVendors = vendorQuery
    ? siteVendors.filter((c) => c.name.toLowerCase().includes(vendorQuery))
    : siteVendors;

  // One "Expense under" choice. A real radio underneath, so arrow keys move
  // between the choices.
  const renderUnderOption = ({
    value,
    label,
    badge,
    hint,
    tile = false,
  }: {
    value: string;
    label: string;
    badge: React.ReactNode;
    hint?: string;
    tile?: boolean;
  }) => {
    const checked = underId === value;
    return (
      <label
        key={value}
        className={cn(
          "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-300",
          checked
            ? "bg-blue-50 font-medium text-blue-800"
            : "text-gray-700 hover:bg-gray-50",
          tile &&
            cn(
              "rounded-lg border",
              checked ? "border-blue-200" : "border-dashed border-gray-300",
            ),
        )}>
        <input
          type='radio'
          name={underGroupName}
          value={value}
          checked={checked}
          onChange={() => {
            setUnderId(value);
            if (value === NOT_UNDER) setQuantity("");
          }}
          className='sr-only'
        />
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
            checked ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600",
          )}>
          {badge}
        </span>
        <span className='min-w-0 flex-1 truncate'>{label}</span>
        {hint && (
          <span className='shrink-0 text-xs font-normal text-gray-400'>{hint}</span>
        )}
        {checked && <Check className='size-4 shrink-0 text-blue-600' />}
      </label>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='w-full sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden max-h-[92dvh]'>

        <DialogHeader
          className={`shrink-0 px-4 pt-5 pb-4 pr-12 text-left border-b sm:px-6 ${isExceededMode ? "bg-orange-50" : ""}`}>
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
              ? fixedActivityLabel
                ? `The estimated ${fixedActivityLabel} is fully procured. Will be recorded as exceeded.`
                : "This activity's estimated quantity is fully used. Will be recorded as exceeded."
              : spentOn
                ? `Spent on ${spentOn.label}.`
                : isEditing
                  ? "Update the expense details below."
                  : "Record an amount spent on this site."}
          </DialogDescription>
        </DialogHeader>

        {isExceededMode && (
          <div className='shrink-0 mx-4 mt-4 sm:mx-6 flex items-start gap-2.5 rounded-lg bg-orange-50 border border-orange-200 px-3.5 py-3'>
            <AlertTriangle className='w-4 h-4 text-orange-500 shrink-0 mt-0.5' />
            <div>
              <p className='text-xs font-semibold text-orange-700'>
                Exceeded — {selectedActivity?.label}
              </p>
              <p className='text-[10px] text-orange-600 mt-0.5'>
                Est: {estimateQty} {selectedActivity?.unit ?? "Nos"} · Fully{" "}
                {fixedActivityLabel ? "procured" : "used"} ({alreadyUsedQty}).
                Recording as over-budget.
              </p>
            </div>
          </div>
        )}

        <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 sm:px-6'>

          {takesSeveralItems && (
            <ExpenseOrderItemLines
              items={order.items}
              picked={pickedItems}
              onChange={setPickedItems}
            />
          )}

          {/* What on the order the expense is for. A single-expense
              requirement that has its one can't take another. */}
          {order && !takesSeveralItems && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                Item <span className='text-red-500'>*</span>
              </Label>
              <Select
                value={orderItemId}
                onValueChange={(value) => {
                  setOrderItemId(value);
                  // Its unit may differ from the last item's.
                  setQuantity("");
                }}>
                <SelectTrigger className='h-9 w-full text-sm'>
                  <SelectValue placeholder='Choose what the expense is for' />
                </SelectTrigger>
                <SelectContent>
                  {order.items.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={String(item.id)}
                      disabled={item.isTaken}
                      className='text-sm'>
                      {item.label}
                      <span className='ml-1 text-gray-400'>
                        ·{" "}
                        {item.unitRate !== null
                          ? rateLabel(item.unitRate, item.unit)
                          : "no rate"}
                        {item.isTaken && " · recorded"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {siteVendors.length > 0 && (
            <fieldset className='min-w-0'>
              <legend className='mb-1.5 text-xs font-medium text-gray-700'>
                Expense under <span className='text-red-500'>*</span>
              </legend>

              <div className='space-y-2'>
                <div className='overflow-hidden rounded-lg border border-gray-200'>
                  {siteVendors.length >= VENDOR_SEARCH_FROM && (
                    <div className='relative border-b border-gray-100'>
                      <Search className='pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400' />
                      <input
                        type='search'
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        placeholder='Find a vendor'
                        aria-label='Find a vendor'
                        className='h-9 w-full bg-transparent pl-8 pr-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-50/60'
                      />
                    </div>
                  )}
                  {/* Two columns that scroll inside a fixed height, however
                      many vendors there are. */}
                  <div className='grid max-h-44 grid-cols-1 gap-0.5 overflow-y-auto p-1 sm:grid-cols-2'>
                    {shownVendors.map((c) =>
                      renderUnderOption({
                        value: String(c.id),
                        label: capitalFirstLetter(c.name),
                        badge: initialsOf(c.name),
                      }),
                    )}
                    {shownVendors.length === 0 && (
                      <p className='col-span-full px-2 py-2 text-xs text-gray-400'>
                        No vendor matches &ldquo;{vendorSearch.trim()}&rdquo;.
                      </p>
                    )}
                  </div>
                </div>

                {/* An order's expense is always under one of its vendors. */}
                {!spentOn &&
                  renderUnderOption({
                    value: NOT_UNDER,
                    label: "Miscellaneous",
                    badge: <ReceiptIndianRupee className='size-3.5' />,
                    hint: "Not under any vendor",
                    tile: true,
                  })}
              </div>
            </fieldset>
          )}

          {takesSeveralActivities && (
            <ExpenseActivityLines
              lines={lines}
              onChange={setLines}
              activities={activities}
              usedQtyByActivity={usedQtyByActivity}
              note={activitiesNote}
            />
          )}

          {!takesSeveralActivities && (activities.length > 0 || activitiesNote) && (
            <div className='space-y-1.5'>
              <div
                className={cn(
                  "grid grid-cols-1 gap-3",
                  fixedActivityKey ? "sm:grid-cols-[16rem]" : "sm:grid-cols-[1fr_11rem]",
                )}>
                {!fixedActivityKey && (
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-gray-700'>
                      Activity <span className='text-red-500'>*</span>
                    </Label>
                    <Select
                      open={isActivityPickerOpen}
                      onOpenChange={setIsActivityPickerOpen}
                      value={selectedActivityKey}
                      disabled={activities.length === 0}
                      onValueChange={(v) => {
                        setSelectedActivityKey(v);
                        setQuantity("");
                      }}>
                      <SelectTrigger className='h-9 w-full text-sm'>
                        <SelectValue
                          placeholder={
                            activities.length === 0
                              ? "No activities to choose"
                              : "Select activity this expense belongs to..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {activities.map((a) => (
                          <SelectItem key={a.key} value={a.key} className='text-sm'>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {activitiesNote && (
                      <p className='text-[11px] text-gray-400'>{activitiesNote}</p>
                    )}
                  </div>
                )}

                {/* Always in place; it opens once an activity is chosen, and
                    never for a miscellaneous expense. Until an activity is
                    chosen a click on it opens the activity list instead. */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-gray-700'>
                    {fixedActivityKey && selectedActivity
                      ? `${selectedActivity.label} used`
                      : "Quantity"}{" "}
                    <span className='text-gray-400'>(optional)</span>
                  </Label>
                  <div
                    className={cn(
                      "relative",
                      !selectedActivityKey && !isMiscellaneous && "cursor-pointer",
                    )}
                    onClick={() => {
                      if (!selectedActivityKey && !isMiscellaneous) {
                        setIsActivityPickerOpen(true);
                      }
                    }}>
                    <Input
                      type='number' min='0' step='0.01'
                      placeholder={
                        isMiscellaneous
                          ? "Vendors only"
                          : selectedActivityKey
                            ? "0.00"
                            : "Pick activity"
                      }
                      value={isMiscellaneous ? "" : quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={!canEnterQuantity}
                      aria-invalid={qtyExceedsRemaining || undefined}
                      className='h-9 pr-12 text-sm'
                    />
                    {canEnterQuantity && (
                      <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                        {qtyUnit}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isMiscellaneous && (
                <p className='text-xs text-gray-500'>
                  {fixedActivityLabel
                    ? `Miscellaneous expenses don't procure ${fixedActivityLabel}. Choose a vendor to record it.`
                    : "Miscellaneous expenses don't record a quantity. Choose a vendor to deduct one from the activity."}
                </p>
              )}

              {/* A quantity is used up from the activity's estimate. */}
              {canEnterQuantity && !isExceededMode && remainingQty !== null && estimateQty !== null && (
                <p
                  className={cn(
                    "text-xs",
                    qtyExceedsRemaining ? "text-red-600" : "text-gray-500",
                  )}>
                  {qtyExceedsRemaining
                    ? `Only ${describeLeft(`${formatQty(remainingQty)} ${qtyUnit}`)}.`
                    : enteredQty > 0
                      ? `${describeLeft(`${formatQty(remainingQty - enteredQty)} of ${formatQty(estimateQty)} ${qtyUnit}`, true)}.`
                      : `${describeLeft(`${formatQty(remainingQty)} of ${formatQty(estimateQty)} ${qtyUnit}`)}.`}
                </p>
              )}
            </div>
          )}

          {/* A rated requirement's expense gives the quantity worked, which
              its rate prices. */}
          {orderRate !== null && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium text-gray-700'>
                {orderItem?.singleExpense ? "Total quantity" : "Quantity"}{" "}
                <span className='text-red-500'>*</span>
              </Label>
              <div className='sm:w-1/2 sm:pr-1.5'>
                <div className='relative'>
                  <Input
                    type='number' min='0' step='0.01' placeholder='0.00'
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className='h-9 pr-20 text-sm'
                  />
                  <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                    {orderUnit}
                  </span>
                </div>
              </div>
              <p className='text-xs text-gray-500'>
                At {rateLabel(orderRate, orderUnit)}
                {orderItem?.singleExpense
                  ? ". The requirement takes this one expense, so give its total."
                  : "."}
              </p>
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
                          <RecordCode code={c.code} />
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
            <Label
              htmlFor={descriptionId}
              className='text-xs font-medium text-gray-700'>
              Description <span className='text-gray-400'>(optional)</span>
            </Label>
            <Textarea
              id={descriptionId}
              placeholder='e.g. Excavation labour for week 2'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              className='max-h-32 resize-none text-sm'
            />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {/* Each activity line has its own amount. */}
            {takesSeveralActivities ? (
              singleDateField
            ) : takesSeveralItems ? (
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium text-gray-700'>Amount</Label>
                <p className='flex h-9 items-center gap-1.5 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 text-sm tabular-nums'>
                  {pickedItemsTotal > 0 ? (
                    <>
                      <span className='font-medium text-gray-900'>
                        {formatAmount(pickedItemsTotal)}
                      </span>
                      {pickedItemList.length > 1 && (
                        <span className='text-xs text-gray-400'>
                          for {pickedItemList.length} items
                        </span>
                      )}
                    </>
                  ) : (
                    <span className='text-gray-400'>Each item&apos;s total</span>
                  )}
                </p>
              </div>
            ) : orderRate !== null ? (
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium text-gray-700'>Amount</Label>
                <p className='flex h-9 items-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 text-sm tabular-nums'>
                  {pricedAmount !== null ? (
                    <span className='font-medium text-gray-900'>
                      {formatAmount(pricedAmount)}
                    </span>
                  ) : (
                    <span className='text-gray-400'>Quantity × rate</span>
                  )}
                </p>
              </div>
            ) : (
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
            )}
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

          {takesSeveralActivities ? null : isOneDay ? (
            <div className='sm:w-1/2 sm:pr-1.5'>{singleDateField}</div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium text-gray-700'>
                  Start date <span className='text-red-500'>*</span>
                </Label>
                <DatePicker
                  value={startDate}
                  aria-label='Start date'
                  onChange={(next) => {
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
                <DatePicker
                  value={endDate}
                  min={startDate || undefined}
                  onChange={setEndDate}
                  aria-label='End date'
                  className='h-9 text-sm'
                />
              </div>
            </div>
          )}

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

        <div className={`shrink-0 flex gap-2 px-4 py-4 border-t sm:px-6 ${isExceededMode ? "bg-orange-50/60" : "bg-white"}`}>
          <CustomButton
            text={
              isUploadingDoc
                ? `Uploading… ${sharePointUpload.progress}%`
                : isEditing
                  ? "Save Changes"
                  : takesSeveralActivities && lines.length > 1
                    ? `Record ${lines.length} Expenses`
                    : takesSeveralItems && pickedItemList.length > 1
                      ? `Record ${pickedItemList.length} Expenses`
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
