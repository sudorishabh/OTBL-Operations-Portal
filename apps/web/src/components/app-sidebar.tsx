"use client";
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  LayoutDashboard,
  User,
  Settings,
  ReceiptIndianRupee,
  Tent,
  Users,
  Webhook,
  LogOut,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

type NavItem = {
  title: string;
  link: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Global roles that must not see this item */
  hideForRoles?: readonly string[];
};

const sidebarLinks: NavItem[] = [
  {
    title: "Overview",
    link: "/",
    icon: LayoutDashboard,
  },
  {
    title: "User Management",
    link: "/user",
    icon: Users,
    hideForRoles: [
      ROLES.MANAGER,
      ROLES.OPERATOR,
      ROLES.OFFICE_OPERATOR,
      ROLES.SITE_OPERATOR,
    ],
  },

  {
    title: "Offices & Sites",
    link: "/office-site",
    icon: Tent,
  },
  {
    title: "Clients",
    link: "/client",
    icon: Webhook,
  },
  {
    title: "Work Orders",
    link: "/work-order",
    icon: ReceiptIndianRupee,
  },
];

const footerLinks = [
  {
    title: "Profile",
    link: "/profile",
    icon: User,
  },
  {
    title: "Logout",
    icon: LogOut,
  },
];

interface SidebarMenuListProps {
  item: {
    title: string;
    link?: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
  isActive: boolean;
}

const SidebarMenuList = ({ item, isActive }: SidebarMenuListProps) => {
  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className={cn(
          "h-7 pl-3 ",
          isActive
            ? "bg-emerald-600! text-gray-100! shadow"
            : "text-gray-300! hover:bg-emerald-600/65 focus:bg-transparent!",
        )}>
        <Link
          href={`/dashboard${item.link}`}
          className='flex items-center gap-3'>
          <item.icon className={cn("h-4 w-4")} />
          <span className={cn("text-xs", isActive ? "font-semibold" : "")}>
            {item.title}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

function AppSidebar() {
  let pathname = usePathname();
  const { state } = useSidebar();
  const { user, logout } = useAuthContext();

  const visibleNavLinks = useMemo(() => {
    return sidebarLinks.filter((item) => {
      if (!item.hideForRoles?.length) return true;
      if (!user?.role) return false;
      return !item.hideForRoles.includes(user.role);
    });
  }, [user?.role]);

  if (!pathname.startsWith("/dashboard")) {
    return null;
  } else {
    pathname = pathname.replace("/dashboard", "") || "/";
  }

  return (
    <Sidebar
      collapsible='icon'
      className='border-0 w-56'>
      <SidebarHeader className='p-6 bg-cyan-900'>
        <div className='flex flex-col justify-center items-center gap-2'>
          <Image
            src='/Otbl-logo_transparent.png'
            alt='OTBL Logo'
            width={112}
            height={64}
            className='h-16 w-28 object-contain'
            loading='eager'
          />
          {state !== "collapsed" && (
            <span className='text-xs text-gray-100'>Management System</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className='px-3 bg-cyan-900'>
        <Separator className='bg-gray-400' />
        <SidebarGroup>
          <SidebarGroupLabel className='text-[11px] font-medium text-gray-300 uppercase tracking-wider'>
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu className='mt-2'>
            {visibleNavLinks.map((item) => {
              const isActive =
                item.link === "/"
                  ? pathname === item.link
                  : pathname.startsWith(item.link);

              return (
                <SidebarMenuList
                  key={item.title}
                  item={item}
                  isActive={isActive}
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <Separator className='bg-gray-400' />

        <SidebarGroup>
          <SidebarGroupLabel className='text-[11px] font-medium text-gray-300 uppercase tracking-wider'>
            Account
          </SidebarGroupLabel>
          <SidebarMenu className='mt-2'>
            {footerLinks.map((item) => {
              const isActive = pathname === item.link;
              if (item.title === "Logout") {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      onClick={() => logout()}
                      className='h-7 pl-3 text-gray-300! hover:bg-emerald-600/65 focus:bg-transparent!'>
                      <item.icon className='h-4 w-4' />
                      <span className='text-xs'>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }
              return (
                <SidebarMenuList
                  key={item.title}
                  item={item}
                  isActive={isActive}
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
