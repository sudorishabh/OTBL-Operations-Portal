import type { Crumb } from "@/components/shared/page-breadcrumbs";
import {
  workOrderPath,
  type WorkOrderFrom,
} from "@/components/work-order/work-order-path";

// The portal's sections, named as the sidebar names them.
const SECTIONS = {
  users: { label: "User Management", href: "/dashboard/user" },
  offices: { label: "Offices & Sites", href: "/dashboard/office-site" },
  clients: { label: "Clients", href: "/dashboard/client" },
  workOrders: { label: "Work Orders", href: "/dashboard/work-order" },
  vendors: { label: "Vendors", href: "/dashboard/vendor" },
  profile: { label: "Profile", href: "/dashboard/profile" },
} satisfies Record<string, Required<Crumb>>;

export type Section = keyof typeof SECTIONS;

// A section's own page, such as the client list.
export const sectionTrail = (section: Section): Crumb[] => [
  { label: SECTIONS[section].label },
];

// One record of a section, such as an office or a vendor.
export const recordTrail = (section: Section, label: string): Crumb[] => [
  SECTIONS[section],
  { label },
];

export type WorkOrderTrail = {
  id: string | number;
  code?: string | null;
  // The work order list, or its client's page.
  from: WorkOrderFrom;
  client?: { id: string | number; name?: string | null };
};

const workOrderLabel = (code?: string | null) =>
  code ? code.toUpperCase() : "Work Order";

// The steps above a work order: the work order list, or its client.
const workOrderParents = ({ from, client }: WorkOrderTrail): Crumb[] =>
  from === "client" && client
    ? [
        SECTIONS.clients,
        {
          label: client.name || "Client",
          href: `/dashboard/client/${client.id}`,
        },
      ]
    : [SECTIONS.workOrders];

// A work order's own page.
export const workOrderTrail = (workOrder: WorkOrderTrail): Crumb[] => [
  ...workOrderParents(workOrder),
  { label: workOrderLabel(workOrder.code) },
];

// A page under a work order, such as one of its sites or its restoration.
export const workOrderChildTrail = (
  workOrder: WorkOrderTrail,
  label: string,
): Crumb[] => [
  ...workOrderParents(workOrder),
  {
    label: workOrderLabel(workOrder.code),
    href: workOrderPath(workOrder.id, workOrder.from),
  },
  { label },
];
