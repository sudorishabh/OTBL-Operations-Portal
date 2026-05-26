"use client";

import AppSidebar from "@/components/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { trpc } from "@/lib/trpc";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    data: layout,
    isSuccess,
    isError,
    error,
  } = trpc.authQuery.dashboardLayout.useQuery(undefined, { retry: false });

  // Secondary auth check — if the tRPC backend rejects the session (expired
  // token, invalid JWT, or middleware bypass), kick the user back to login.
  // This is the defence-in-depth layer that protects even if Next.js middleware
  // is bypassed (e.g. CVE-2025-29927).
  useEffect(() => {
    if (!isError) return;
    const code = (error as { data?: { code?: string } })?.data?.code;
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
      let cancelled = false;

      // Defer navigation to avoid dev Fast Refresh/router init races.
      queueMicrotask(() => {
        if (cancelled) return;
        const loginUrl = new URL("/login", window.location.origin);
        loginUrl.searchParams.set("return-url", pathname);
        router.replace(loginUrl.pathname + loginUrl.search);
      });

      return () => {
        cancelled = true;
      };
    }
  }, [isError, error, pathname, router]);

  const hideSidebar =
    isSuccess &&
    layout?.success &&
    (layout.mode === "site_only" || layout.mode === "wo_site_upload");

  useEffect(() => {
    if (!isSuccess || !layout?.success) return;

    if (layout.mode === "wo_site_upload") {
      if (!pathname.startsWith("/dashboard/wo-site")) {
        const target =
          layout.workOrderSiteIds.length === 1 && layout.defaultWorkOrderSiteId
            ? `/dashboard/wo-site/${layout.defaultWorkOrderSiteId}`
            : "/dashboard/wo-site";
        let cancelled = false;
        queueMicrotask(() => {
          if (cancelled) return;
          router.replace(target);
        });
        return () => {
          cancelled = true;
        };
      }
      return;
    }

    if (layout.mode === "site_only") {
      if (!pathname.startsWith("/dashboard/site-assigned")) {
        let cancelled = false;
        queueMicrotask(() => {
          if (cancelled) return;
          router.replace("/dashboard/site-assigned");
        });
        return () => {
          cancelled = true;
        };
      }
    }
  }, [isSuccess, layout, pathname, router]);

  const insetClass = hideSidebar ? "md:pl-0" : "md:pl-56";

  return (
    <>
      {!hideSidebar && <AppSidebar />}
      <SidebarInset className={insetClass}>
        {!hideSidebar && (
          <header className='sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-gray-200 bg-cyan-900 px-3 md:hidden'>
            <SidebarTrigger className='text-gray-100 hover:bg-emerald-600/65 hover:text-gray-100' />
            <Image
              src='/otbl-logo.png'
              alt='OTBL'
              width={64}
              height={32}
              className='h-8 w-auto object-contain'
              loading='eager'
            />
          </header>
        )}
        {children}
      </SidebarInset>
    </>
  );
}
