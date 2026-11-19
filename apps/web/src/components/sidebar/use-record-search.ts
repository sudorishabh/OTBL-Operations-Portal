"use client";
import { keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { trpc, type RouterOutputs } from "@/lib/trpc";

type WorkOrderRow =
  RouterOutputs["workOrderQuery"]["getAll"]["workOrders"][number];
type ClientRow = RouterOutputs["clientQuery"]["getClients"][number];
type OfficeRow = RouterOutputs["officeQuery"]["getOffices"]["offices"][number];
type VendorRow =
  RouterOutputs["contractorQuery"]["getVendors"]["vendors"][number];

// One thing the quick search can open: a page or a record.
export type SearchResult = {
  key: string;
  title: string;
  // The record's code, such as CLT-0012.
  code?: string;
  // A second line placing the record, such as its client or city.
  detail?: string;
  href: string;
};

// Results from one section of the portal, named by its sidebar link.
export type SearchSection = {
  link: string;
  label: string;
  results: SearchResult[];
};

// Records are searched from this many letters, so one key fetches nothing.
export const MIN_SEARCH_LENGTH = 2;

// How many records each section shows.
const PER_SECTION = 5;

const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(" · ") || undefined;

// The records matching a search, in each section whose link the user has.
// Earlier results stay on screen while the next ones load.
export const useRecordSearch = (search: string, links: readonly string[]) => {
  const term = useDebounce(search.trim(), 250);
  const ready = term.length >= MIN_SEARCH_LENGTH;
  const searches = (link: string) => ready && links.includes(link);
  const shared = { placeholderData: keepPreviousData, staleTime: 60 * 1000 };

  const workOrders = trpc.workOrderQuery.getAll.useQuery(
    { page: 1, limit: PER_SECTION, searchQuery: term },
    { ...shared, enabled: searches("/work-order") },
  );
  const clients = trpc.clientQuery.getClients.useQuery(
    { searchQuery: term },
    { ...shared, enabled: searches("/client") },
  );
  const offices = trpc.officeQuery.getOffices.useQuery(
    { page: 1, limit: PER_SECTION, searchQuery: term },
    { ...shared, enabled: searches("/office-site") },
  );
  const vendors = trpc.contractorQuery.getVendors.useQuery(
    { page: 1, limit: PER_SECTION, search: term },
    { ...shared, enabled: searches("/vendor") },
  );

  const sections: SearchSection[] = !ready
    ? []
    : [
        {
          link: "/work-order",
          label: "Work Orders",
          results: (workOrders.data?.workOrders ?? []).map(
            (wo: WorkOrderRow) => ({
              key: `work-order-${wo.id}`,
              title: wo.code ? wo.code.toUpperCase() : "Work Order",
              detail: joinParts(wo.client_name, wo.office_name),
              href: `/dashboard/work-order/${wo.id}`,
            }),
          ),
        },
        {
          link: "/client",
          label: "Clients",
          results: (clients.data ?? [])
            .slice(0, PER_SECTION)
            .map((client: ClientRow) => ({
              key: `client-${client.id}`,
              title: client.name,
              code: client.code,
              detail: joinParts(client.parent_client_name, client.city),
              href: `/dashboard/client/${client.id}`,
            })),
        },
        {
          link: "/office-site",
          label: "Offices",
          results: (offices.data?.offices ?? []).map((office: OfficeRow) => ({
            key: `office-${office.id}`,
            title: office.name,
            code: office.code,
            detail: joinParts(office.city, office.state),
            href: `/dashboard/office-site/${office.id}`,
          })),
        },
        {
          link: "/vendor",
          label: "Vendors",
          results: (vendors.data?.vendors ?? []).map((vendor: VendorRow) => ({
            key: `vendor-${vendor.id}`,
            title: vendor.name,
            code: vendor.code,
            detail: joinParts(vendor.state),
            href: `/dashboard/vendor/${vendor.id}`,
          })),
        },
      ].filter((section) => searches(section.link));

  const queries = [workOrders, clients, offices, vendors];

  // Still typing, or still waiting on a section.
  const isSearching =
    search.trim() !== term ||
    (ready && queries.some((query) => query.isFetching));

  // A section couldn't be searched, so its records may be missing.
  const failed = ready && queries.some((query) => query.isError);

  return { sections, ready, isSearching, failed };
};
