// Where a work order page was reached from: the work order list, or a client.
export type WorkOrderFrom = "list" | "client";

// The work order page that its restoration and site pages sit under.
export const workOrderPath = (workOrderId: string | number, from: WorkOrderFrom) =>
  from === "client"
    ? `/dashboard/client/workorder/${workOrderId}`
    : `/dashboard/work-order/${workOrderId}`;
