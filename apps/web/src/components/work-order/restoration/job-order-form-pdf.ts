import { format } from "date-fns";
import { constants } from "@pkg/utils";
import type { JobOrder, JobOrderWorkOrder } from "./job-order-dialog";

const { JOB_ORDER_ACTIVITIES } = constants;

// What the printed form shows of a job order.
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
>;

const MARGIN = 16;
const FONT = "times";

// Dates as the client writes them on the form.
const formDate = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "dd.MM.yyyy") : "";

// A file name the job order number can't break, as it often has slashes.
const fileName = (joNumber: string) =>
  `Job Order ${joNumber.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;

type FormWorkOrder = Pick<
  JobOrderWorkOrder,
  "title" | "start_date" | "end_date"
>;

// The job order as the client's form, filled in and ready to print for the
// installation manager's and the contractor's signatures.
export const buildJobOrderForm = async (
  jobOrder: JobOrderFormContent,
  workOrder: FormWorkOrder,
) => {
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
  if (jobOrder.issued_by) {
    doc.setFont(FONT, "bold").setFontSize(12);
    doc.text(jobOrder.issued_by, MARGIN, y);
    y += 5.5;
  }

  doc.setFont(FONT, "normal").setFontSize(11);
  const reference = doc.splitTextToSize(
    `Ref.: ${workOrder.title}, for the period from ${formDate(workOrder.start_date)} to ${formDate(workOrder.end_date)}`,
    width,
  );
  doc.text(reference, MARGIN, y);
  y += reference.length * 4.8 + 3;

  doc.setFont(FONT, "bold").setFontSize(13);
  doc.text("Job Order (Issued by Installation Manager)", MARGIN, y);

  // Each activity's own date replaces the one completion date when given.
  const activities = jobOrder.activities ?? [];
  const hasActivityDates = activities.some((row) => row.completion_date);

  autoTable(doc, {
    ...table,
    startY: y + 2,
    columnStyles: { 0: { cellWidth: width * 0.4 } },
    body: [
      [
        "RC NOA No./date",
        [
          jobOrder.rc_noa_number,
          jobOrder.rc_noa_date && `Date: ${formDate(jobOrder.rc_noa_date)}`,
        ]
          .filter(Boolean)
          .join("      "),
      ],
      ["OLA No", jobOrder.ola_number ?? ""],
      ["PO NO.", jobOrder.po_number ?? ""],
      ["Installation Name", jobOrder.installation_name ?? ""],
      ["Job Order No.", jobOrder.jo_number],
      ["Job Order Date", formDate(jobOrder.start_date)],
      ["Location of the job", jobOrder.location ?? ""],
      [
        "Mobilization date:\n(Applicable only for Ex-situ bioremediation jobs)",
        formDate(jobOrder.mobilization_date),
      ],
      [
        "Schedule work completion date/s (ref. RC Contract copy 3.2)",
        hasActivityDates ? "Given below." : formDate(jobOrder.end_date),
      ],
    ],
  });

  const entries = new Map(activities.map((row) => [row.key, row]));
  autoTable(doc, {
    ...table,
    startY: tableEnd() + 4,
    head: [["Activity", "Unit", "Quantity", "Schedule Work completion date"]],
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
    body: JOB_ORDER_ACTIVITIES.map((activity) => {
      const entry = entries.get(activity.key);
      return [
        {
          content: activity.label,
          styles: activity.indent
            ? { cellPadding: { top: 1.6, right: 1.6, bottom: 1.6, left: 6 } }
            : {},
        },
        activity.unit,
        entry?.quantity ?? "",
        formDate(entry?.completion_date),
      ];
    }),
  });

  // Left blank for signing, with each box's title in bold above.
  const signatureTitles = ["Issued by:", "Job Order received."];
  autoTable(doc, {
    ...table,
    startY: tableEnd() + 5,
    styles: {
      ...table.styles,
      fontSize: 11,
      valign: "top",
      minCellHeight: 42,
      cellPadding: { top: 9, right: 2, bottom: 2, left: 2 },
    },
    columnStyles: { 0: { cellWidth: width / 2 } },
    body: [
      [
        "Sign. (with date & seal) of Installation Manager",
        "Sign. (with date) of the contractor representative",
      ],
    ],
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      doc.setFont(FONT, "bold").setFontSize(11);
      doc.text(
        signatureTitles[data.column.index] ?? "",
        data.cell.x + 2,
        data.cell.y + 5.5,
      );
    },
  });

  return doc;
};

export const downloadJobOrderForm = async (
  jobOrder: JobOrderFormContent,
  workOrder: FormWorkOrder,
) => {
  const doc = await buildJobOrderForm(jobOrder, workOrder);
  doc.save(fileName(jobOrder.jo_number));
};
