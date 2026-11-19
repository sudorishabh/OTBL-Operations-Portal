import { cookies } from "next/headers";
import { isSidebarOpen, SIDEBAR_COOKIE_NAME } from "@/lib/sidebar";
import { DashboardShell } from "./dashboard-shell";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Open the sidebar expanded or collapsed, the way it was last left.
  const cookieStore = await cookies();
  const sidebarOpen = isSidebarOpen(
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value,
  );

  return <DashboardShell sidebarOpen={sidebarOpen}>{children}</DashboardShell>;
}
