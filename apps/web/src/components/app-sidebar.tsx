"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, type ComponentType, type SVGProps } from "react";
import {
  HardHat,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptIndianRupee,
  Tent,
  Users,
  Webhook,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/components/sidebar/user-menu";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

type NavItem = {
  title: string;
  // The page's path under /dashboard.
  link: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  hideForRoles?: readonly string[];
};

type NavGroup = {
  // Unnamed groups sit above the named ones without a heading.
  label?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
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

// Every row of the sidebar shares one look: the page you're on in emerald,
// the rest lighting up on hover.
const ROW_CLASS =
  "h-8 gap-3 px-2.5 text-[13px] text-sidebar-foreground/85 data-[active=true]:bg-sidebar-primary data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm data-[active=true]:hover:bg-sidebar-primary";

// Folded to icons, a heading slides up out of sight by its own height.
const GROUP_LABEL_CLASS =
  "h-6 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/55 group-data-[collapsible=icon]:-mt-6";

// Whether a link leads to the page being viewed, or to a page above it.
const isLinkActive = (link: string, pathname: string) =>
  link === "/"
    ? pathname === "/"
    : pathname === link || pathname.startsWith(`${link}/`);

const NavLink = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className={ROW_CLASS}>
        <Link
          href={`/dashboard${item.link}`}
          aria-current={isActive ? "page" : undefined}
          // Tapping the page already open changes no route, so close the
          // phone drawer here too.
          onClick={() => setOpenMobile(false)}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

// Holds a link's place while the user, and so which links they get, loads.
const NavLinkSkeleton = () => (
  <SidebarMenuItem
    aria-hidden='true'
    className='flex h-8 items-center gap-3 px-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'>
    <Skeleton className='size-4 shrink-0 bg-white/15' />
    <Skeleton className='h-3 w-24 bg-white/15 group-data-[collapsible=icon]:hidden' />
  </SidebarMenuItem>
);

// Folds the sidebar down to its icons, or opens it back out. Ctrl/⌘ + B and
// the sidebar's edge do the same. Phones open the sidebar from the top bar.
const CollapseToggle = () => {
  const { state, isMobile, toggleSidebar } = useSidebar();
  if (isMobile) return null;

  const collapsed = state === "collapsed";
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={`${label} (Ctrl+B)`}
        onClick={toggleSidebar}
        className={cn(ROW_CLASS, "text-sidebar-foreground/65")}>
        <Icon />
        <span>{label}</span>
        <kbd className='ml-auto rounded border border-sidebar-border px-1 font-sans text-[10px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden'>
          Ctrl B
        </kbd>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

function AppSidebar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useAuthContext();
  const { setOpenMobile } = useSidebar();

  // On phones the sidebar is a drawer over the page: close it once the user
  // has gone somewhere, from a link, the user menu or the back button.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  // The groups this user gets, each holding only the links their role sees.
  const visibleGroups = useMemo(() => {
    if (isUserLoading) return [];
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.hideForRoles?.length ||
          (!!user?.role && !item.hideForRoles.includes(user.role)),
      ),
    })).filter((group) => group.items.length > 0);
  }, [isUserLoading, user?.role]);

  if (!pathname.startsWith("/dashboard")) return null;
  const page = pathname.replace("/dashboard", "") || "/";

  // Which links show depends on the role, so hold every link's place until
  // the user is known rather than adding some later.
  const groups = isUserLoading ? NAV_GROUPS : visibleGroups;

  return (
    <Sidebar
      collapsible='icon'
      className='border-0'>
      <SidebarHeader className='items-center px-4 pt-5 pb-4 transition-[padding] group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4'>
        <Link
          href='/dashboard'
          title='Go to overview'
          className='flex flex-col items-center gap-1.5 rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring'>
          <Image
            src='/Otbl-logo_transparent.png'
            alt='OTBL'
            width={112}
            height={64}
            className='h-16 w-28 object-contain transition-[width,height] duration-200 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-8'
            loading='eager'
          />
          <span className='text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden'>
            Operations Portal
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className='gap-0 px-1.5 py-1 group-data-[collapsible=icon]:px-0'>
        {groups.map((group, index) => (
          <SidebarGroup
            key={group.label ?? index}
            className='py-1.5'>
            {group.label && (
              <SidebarGroupLabel className={GROUP_LABEL_CLASS}>
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) =>
                isUserLoading ? (
                  <NavLinkSkeleton key={item.title} />
                ) : (
                  <NavLink
                    key={item.title}
                    item={item}
                    isActive={isLinkActive(item.link, page)}
                  />
                ),
              )}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className='px-3.5 pt-2 pb-3 group-data-[collapsible=icon]:px-2'>
        <SidebarMenu>
          <CollapseToggle />
          <UserMenu />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
