import { format } from "date-fns";
import { constants } from "@pkg/utils";
import type { JobOrder, JobOrderWorkOrder } from "./job-order-dialog";

const { JOB_ORDER_ACTIVITIES } = constants;

// What the printed forms show of a job order.
export type JobOrderFormContent = Pick<
  JobOrder,
  | "jo_number"
  | "start_date"
  | "end_date"
  | "issued_by"
  | "rc_noa_number"
  | "rc_noa_date"
  | "ola_number"
  | "po_number"
  | "installation_name"
  | "location"
  | "mobilization_date"
  | "activities"
  | "completed_on"
  | "completion_activities"
>;

type FormWorkOrder = Pick<
  JobOrderWorkOrder,
  "title" | "start_date" | "end_date"
>;

type ActivityRows = JobOrder["activities"];

// One of the client's forms for a job order: a heading, a table of details,
// an activity table, and two boxes left blank for signing.
interface ClientForm {
  issuedBy: string | null | undefined;
  workOrder: FormWorkOrder;
  title: string;
  details: [string, string][];
  activityHead: [string, string, string, string];
  activities: {
    label: string;
    unit: string;
    indent: boolean;
    quantity: string;
    date: string;
  }[];
  // Each box's bold title, and what is signed under it.
  signatures: [
    { title: string; text: string },
    { title: string; text: string },
  ];
}

const MARGIN = 16;
const FONT = "times";

// Dates as the client writes them on the forms.
const formDate = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "dd.MM.yyyy") : "";

// A file name the job order number can't break, as it often has slashes.
const fileName = (name: string, joNumber: string) =>
  `${name} ${joNumber.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;

const rcNoa = (jobOrder: JobOrderFormContent) =>
  [
    jobOrder.rc_noa_number,
    jobOrder.rc_noa_date && `Date: ${formDate(jobOrder.rc_noa_date)}`,
  ]
    .filter(Boolean)
    .join("      ");

const MOBILIZATION_LABEL =
  "Mobilization date:\n(Applicable only for Ex-situ bioremediation jobs)";

const buildClientForm = async (form: ClientForm) => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const tableEnd = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY;

  const table = {
    theme: "grid" as const,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: FONT,
      fontSize: 10,
      textColor: "#000000",
      lineColor: "#000000",
      lineWidth: 0.2,
      cellPadding: 1.6,
      valign: "middle" as const,
    },
  };

  let y = MARGIN;
  if (form.issuedBy) {
    doc.setFont(FONT, "bold").setFontSize(12);
    doc.text(form.issuedBy, MARGIN, y);
    y += 5.5;
  }

  const { workOrder } = form;
  doc.setFont(FONT, "normal").setFontSize(11);
  const reference = doc.splitTextToSize(
    `Ref.: ${workOrder.title}, for the period from ${formDate(workOrder.start_date)} to ${formDate(workOrder.end_date)}`,
    width,
  );
  doc.text(reference, MARGIN, y);
  y += reference.length * 4.8 + 3;

  doc.setFont(FONT, "bold").setFontSize(13);
  doc.text(form.title, MARGIN, y);

  autoTable(doc, {
    ...table,
    startY: y + 2,
    columnStyles: { 0: { cellWidth: width * 0.4 } },
    body: form.details,
  });

  autoTable(doc, {
    ...table,
    startY: tableEnd() + 4,
    head: [form.activityHead],
    headStyles: {
      fillColor: "#d9d9d9",
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: width * 0.4 },
      1: { cellWidth: width * 0.13, halign: "center" },
      2: { cellWidth: width * 0.2, halign: "center" },
      3: { halign: "center" },
    },
    body: form.activities.map((activity) => [
      {
        content: activity.label,
        styles: activity.indent
          ? { cellPadding: { top: 1.6, right: 1.6, bottom: 1.6, left: 6 } }
          : {},
      },
      activity.unit,
      activity.quantity,
      activity.date,
    ]),
  });

  // The titles are drawn in bold above the text, so the text starts under
  // the longest of them.
  doc.setFont(FONT, "bold").setFontSize(11);
  const titles = form.signatures.map(
    (signature) =>
      doc.splitTextToSize(signature.title, width / 2 - 4) as string[],
  );
  const titleLines = Math.max(...titles.map((lines) => lines.length));

  autoTable(doc, {
    ...table,
    startY: tableEnd() + 5,
    styles: {
      ...table.styles,
      fontSize: 11,
      valign: "top",
      minCellHeight: 42,
      cellPadding: {
        top: 4.5 + titleLines * 4.8,
        right: 2,
        bottom: 2,
        left: 2,
      },
    },
    columnStyles: { 0: { cellWidth: width / 2 } },
    body: [form.signatures.map((signature) => signature.text)],
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      doc.setFont(FONT, "bold").setFontSize(11);
      doc.text(
        titles[data.column.index] ?? [],
        data.cell.x + 2,
        data.cell.y + 5.5,
      );
    },
  });

  return doc;
};

// What is written against each activity row, in the form's order.
const activityEntries = (rows: ActivityRows) =>
  new Map((rows ?? []).map((row) => [row.key, row]));

// The job order as the client's job order form, filled in and ready to print
// for the installation manager's and the contractor's signatures.
export const buildJobOrderForm = (
  jobOrder: JobOrderFormContent,
  workOrder: FormWorkOrder,
) => {
  const entries = activityEntries(jobOrder.activities);
  // Each activity's own date replaces the one completion date when given.
  const hasActivityDates = [...entries.values()].some(
    (row) => row.completion_date,
  );

  return buildClientForm({
    issuedBy: jobOrder.issued_by,
    workOrder,
    title: "Job Order (Issued by Installation Manager)",
    details: [
      ["RC NOA No./date", rcNoa(jobOrder)],
      ["OLA No", jobOrder.ola_number ?? ""],
      ["PO NO.", jobOrder.po_number ?? ""],
      ["Installation Name", jobOrder.installation_name ?? ""],
      ["Job Order No.", jobOrder.jo_number],
      ["Job Order Date", formDate(jobOrder.start_date)],
      ["Location of the job", jobOrder.location ?? ""],
      [MOBILIZATION_LABEL, formDate(jobOrder.mobilization_date)],
      [
        "Schedule work completion date/s (ref. RC Contract copy 3.2)",
        hasActivityDates ? "Given below." : formDate(jobOrder.end_date),
      ],
    ],
    activityHead: [
      "Activity",
      "Unit",
      "Quantity",
      "Schedule Work completion date",
    ],
    activities: JOB_ORDER_ACTIVITIES.map((activity) => {
      const entry = entries.get(activity.key);
      return {
        label: activity.label,
        unit: activity.unit,
        indent: activity.indent,
        quantity: entry?.quantity ?? "",
        date: formDate(entry?.completion_date),
      };
    }),
    signatures: [
      {
        title: "Issued by:",
        text: "Sign. (with date & seal) of Installation Manager",
      },
      {
        title: "Job Order received.",
        text: "Sign. (with date) of the contractor representative",
      },
    ],
  });
};

// The job order's work as done, as the client's work completion certificate
// ready to print for the installation manager's and the contractor's
// signatures.
export const buildCompletionCertificate = (
  jobOrder: JobOrderFormContent,
  workOrder: FormWorkOrder,
) => {
  const entries = activityEntries(jobOrder.completion_activities);
  const hasActivityDates = [...entries.values()].some(
    (row) => row.completion_date,
  );

  return buildClientForm({
    issuedBy: jobOrder.issued_by,
    workOrder,
    title: "Work Completion Certificate (Issued by Installation Manager)",
    details: [
      ["RC NOA No./date", rcNoa(jobOrder)],
      ["RC OLA No.", jobOrder.ola_number ?? ""],
      ["P.O No.", jobOrder.po_number ?? ""],
      ["Installation Name", jobOrder.installation_name ?? ""],
      ["Job Order No.", jobOrder.jo_number],
      ["Job Order Date", formDate(jobOrder.start_date)],
      ["Location of the job", jobOrder.location ?? ""],
      [
        MOBILIZATION_LABEL,
        formDate(jobOrder.mobilization_date) || "Not Applicable",
      ],
      [
        "Actual work completion date/s (ref. RC Contract copy 3.2)",
        hasActivityDates ? "Given Below" : formDate(jobOrder.completed_on),
      ],
    ],
    activityHead: [
      "Activity",
      "Unit",
      "Actual Quantity",
      "Work completion date",
    ],
    activities: JOB_ORDER_ACTIVITIES.map((activity) => {
      const entry = entries.get(activity.key);
      return {
        label: activity.completionLabel,
        unit: activity.completionUnit,
        indent: activity.indent,
        quantity: entry?.quantity ?? "",
        date: formDate(entry?.completion_date),
      };
    }),
    signatures: [
      {
        title:
          "Certified that M/S OTBL has satisfactorily completed the Land Restoration job",
        text: "Sign. (with date & seal) of Installation Manager",
      },
      {
        title:
          "Certified that the work has been completed as per the SOW of the contract.",
        text: "Sign. (with date) of the contractor representative",
      },
    ],
  });
};

export const downloadJobOrderForm = async (
  jobOrder: JobOrderFormContent,
  workOrder: FormWorkOrder,
) => {
  const doc = await buildJobOrderForm(jobOrder, workOrder);
  doc.save(fileName("Job Order", jobOrder.jo_number));
};

export const downloadCompletionCertificate = async (
  jobOrder: JobOrderFormContent,
  workOrder: FormWorkOrder,
) => {
  const doc = await buildCompletionCertificate(jobOrder, workOrder);
  doc.save(fileName("Work Completion Certificate", jobOrder.jo_number));
};
