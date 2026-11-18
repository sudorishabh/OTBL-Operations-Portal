"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { VENDOR_DESCRIPTION } from "@/components/vendor/vendor-labels";
import { recordTrail, sectionTrail } from "@/lib/breadcrumbs";
import PageSkeleton from "./page-skeleton";
import ClientsPageSkeleton from "./clients/clients-page-skeleton";
import ClientPageSkeleton from "./client/client-page-skeleton";
import { OfficeSitePageSkeleton } from "./office-site/office-site-skeleton";
import OfficePageSkeleton from "./office-site/office-page-skeleton";
import UserPageSkeleton from "./user/user-page-skeleton";
import {
  VendorDetailSkeleton,
  VendorListSkeleton,
} from "./vendor/vendor-skeletons";
import WorkOrdersSkeleton from "./work-orders/work-orders-skeleton";
import WorkOrderDetailsSkeleton from "./work-order/work-order-details-skeleton";
import {
  RestorationPageSkeleton,
  SiteDetailsSkeleton,
} from "./work-order/site-skeletons";

// The skeleton of whichever dashboard page is opening, for when the route
// guard is still finding out who is signed in. Titles mirror the pages'.
const RouteSkeleton = () => {
  const path = usePathname().replace(/\/$/, "");
  // Work orders opened from a client sit under its page.
  const from = path.startsWith("/dashboard/client/workorder/")
    ? "client"
    : "list";

  if (/\/sites\/[^/]+$/.test(path)) return <SiteDetailsSkeleton from={from} />;
  if (/\/restoration$/.test(path)) {
    return <RestorationPageSkeleton from={from} />;
  }
  if (/\/(work-order|workorder)\/[^/]+$/.test(path)) {
    return <WorkOrderDetailsSkeleton from={from} />;
  }
  if (/^\/dashboard\/client\/[^/]+$/.test(path)) return <ClientPageSkeleton />;
  if (/^\/dashboard\/office-site\/[^/]+$/.test(path)) {
    return <OfficePageSkeleton />;
  }

  switch (path) {
    case "/dashboard/work-order":
      return (
        <PageSkeleton
          title='Work Order Management'
          breadcrumbs={sectionTrail("workOrders")}
          description='Manage work orders, track their progress across offices and sites'>
          <WorkOrdersSkeleton />
        </PageSkeleton>
      );
    case "/dashboard/client":
      return (
        <PageSkeleton
          title='Clients'
          breadcrumbs={sectionTrail("clients")}
          description='Manage and monitor all your clients, their branches and contacts'>
          <ClientsPageSkeleton />
        </PageSkeleton>
      );
    case "/dashboard/user":
      return (
        <PageSkeleton
          title='User Management'
          breadcrumbs={sectionTrail("users")}
          description='Manage users, assign them to offices, and track their work locations'>
          <UserPageSkeleton />
        </PageSkeleton>
      );
    case "/dashboard/office-site":
      return (
        <PageSkeleton
          title='Offices & Sites'
          breadcrumbs={sectionTrail("offices")}
          description='Manage your office locations and work sites'>
          <OfficeSitePageSkeleton />
        </PageSkeleton>
      );
    case "/dashboard/vendor":
      return (
        <PageSkeleton
          title='Vendors'
          breadcrumbs={sectionTrail("vendors")}
          description={VENDOR_DESCRIPTION}>
          <VendorListSkeleton />
        </PageSkeleton>
      );
  }

  if (/^\/dashboard\/vendor\/[^/]+$/.test(path)) {
    return (
      <PageSkeleton
        title='Vendor'
        breadcrumbs={recordTrail("vendors", "Vendor")}
        description='Every order and job order this vendor is on'>
        <VendorDetailSkeleton />
      </PageSkeleton>
    );
  }

  return <PageSkeleton />;
};

export default RouteSkeleton;
