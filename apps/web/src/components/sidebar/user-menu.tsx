"use client";
import Link from "next/link";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { capitalizeEachWord } from "@pkg/utils";

// The first letters of a person's first and last names.
const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words.at(0)?.charAt(0) ?? "";
  const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
};

// "office_operator" reads "Office Operator".
const roleLabel = (role: string) => capitalizeEachWord(role.replace(/_/g, " "));

const Avatar = ({ name, className }: { name: string; className?: string }) => (
  <span
    aria-hidden='true'
    className={cn(
      "flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-semibold text-white ring-1 ring-white/20",
      className,
    )}>
    {initialsOf(name)}
  </span>
);

// Who is signed in, at the foot of the sidebar, opening onto their profile
// and signing out.
export const UserMenu = () => {
  const { user, logout, isUserLoading } = useAuthContext();
  const { isMobile } = useSidebar();

  if (isUserLoading) {
    return (
      <SidebarMenuItem
        aria-hidden='true'
        className='flex h-12 items-center gap-2.5 px-2 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:px-0'>
        <Skeleton className='size-8 shrink-0 rounded-lg bg-white/15' />
        <div className='grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden'>
          <Skeleton className='h-3 w-24 bg-white/15' />
          <Skeleton className='h-2.5 w-16 bg-white/15' />
        </div>
      </SidebarMenuItem>
    );
  }

  if (!user) return null;

  const name = capitalizeEachWord(user.name);

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size='lg'
            tooltip={name}
            className='gap-2.5 px-2 data-[state=open]:bg-sidebar-accent'>
            <Avatar name={name} />
            <span className='grid flex-1 text-left leading-tight'>
              <span className='truncate text-[13px] font-semibold text-white'>
                {name}
              </span>
              <span className='truncate text-[11px] text-sidebar-foreground/65'>
                {roleLabel(user.role)}
              </span>
            </span>
            <ChevronsUpDown className='ml-auto text-sidebar-foreground/60' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side={isMobile ? "top" : "right"}
          align='end'
          sideOffset={8}
          className='w-60'>
          <DropdownMenuLabel className='flex items-center gap-2.5 font-normal'>
            <Avatar name={name} />
            <span className='grid min-w-0 leading-tight'>
              <span className='truncate text-sm font-semibold text-gray-900'>
                {name}
              </span>
              <span className='truncate text-xs text-gray-500'>
                {user.email}
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href='/dashboard/profile'>
              <User />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onSelect={() => logout()}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};
