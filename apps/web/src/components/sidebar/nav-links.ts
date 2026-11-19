import type { ComponentType, SVGProps } from "react";
import {
  HardHat,
  LayoutDashboard,
  ReceiptIndianRupee,
  Tent,
  Users,
  Webhook,
} from "lucide-react";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

export type NavItem = {
  title: string;
  // The page's path under /dashboard.
  link: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  hideForRoles?: readonly string[];
};

export type NavGroup = {
  // Unnamed groups sit above the named ones without a heading.
  label?: string;
  items: NavItem[];
};

// The portal's sections, as the sidebar lists them.
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ title: "Overview", link: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { title: "Work Orders", link: "/work-order", icon: ReceiptIndianRupee },
      { title: "Clients", link: "/client", icon: Webhook },
      { title: "Offices & Sites", link: "/office-site", icon: Tent },
      {
        title: "Vendors",
        link: "/vendor",
        icon: HardHat,
        hideForRoles: [ROLES.SITE_OPERATOR],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "User Management",
        link: "/user",
        icon: Users,
        hideForRoles: [
          ROLES.MANAGER,
          ROLES.OFFICE_OPERATOR,
          ROLES.SITE_OPERATOR,
          ROLES.VIEWER,
        ],
      },
    ],
  },
];

// The groups a role gets, each holding only the links it may see. Without a
// role, only the links open to everyone.
export const navGroupsForRole = (role: string | undefined): NavGroup[] =>
  NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !item.hideForRoles?.length ||
        (!!role && !item.hideForRoles.includes(role)),
    ),
  })).filter((group) => group.items.length > 0);

// Whether a link leads to the page being viewed, or to a page above it. Both
// are paths under /dashboard.
export const isLinkActive = (link: string, page: string) =>
  link === "/" ? page === "/" : page === link || page.startsWith(`${link}/`);

// Where a link leads: Overview is /dashboard itself.
export const navHref = (link: string) =>
  link === "/" ? "/dashboard" : `/dashboard${link}`;
