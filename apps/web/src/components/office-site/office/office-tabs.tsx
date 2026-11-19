import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, MapPinned, Plus } from "lucide-react";
import CustomButton from "@/components/shared/btn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useHandleParams from "@/hooks/useHandleParams";
import OfficeSites from "./office-sites";
import OfficeWorkOrders from "./office-work-orders";
import type { OfficeDetails } from "./office-types";

type OfficeTab = "sites" | "work-orders";

// Underlined tabs along the top of the section.
const TAB_TRIGGER_CLASS =
  "group -mb-px h-auto flex-none gap-2 rounded-none border-0 border-b-2 border-transparent px-0.5 py-3 text-sm font-medium text-gray-500 shadow-none hover:text-gray-800 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:shadow-none";

const Count = ({ value }: { value: number }) => (
  <span className='rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] leading-none tabular-nums text-gray-600 group-data-[state=active]:bg-emerald-50 group-data-[state=active]:text-emerald-700'>
    {value.toLocaleString("en-IN")}
  </span>
);

// The office's sites and work orders, one tab each. The open tab is kept in
// the address, so coming back from a work order reopens its tab.
const OfficeTabs = ({ details }: { details: OfficeDetails }) => {
  const { office, sites, workOrders, canEditSites } = details;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setParams } = useHandleParams();

  const tab: OfficeTab =
    searchParams.get("tab") === "work-orders" ? "work-orders" : "sites";

  const openTab = (next: OfficeTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "sites") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    // Replaced rather than pushed, so tabs don't fill the back button.
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <section className='rounded-lg border bg-white'>
      <Tabs
        value={tab}
        onValueChange={(value) => openTab(value as OfficeTab)}
        className='gap-0'>
        <div className='flex flex-wrap items-center justify-between gap-x-4 border-b border-gray-200 px-4 sm:px-6'>
          <TabsList
            aria-label='Sites and work orders'
            className='h-auto gap-6 rounded-none bg-transparent p-0'>
            <TabsTrigger
              value='sites'
              className={TAB_TRIGGER_CLASS}>
              <MapPinned className='size-4' />
              Sites
              <Count value={sites.total} />
            </TabsTrigger>
            <TabsTrigger
              value='work-orders'
              className={TAB_TRIGGER_CLASS}>
              <ClipboardList className='size-4' />
              Work orders
              <Count value={workOrders.total} />
            </TabsTrigger>
          </TabsList>

          {tab === "sites" && canEditSites && (
            <div className='py-2'>
              <CustomButton
                text='Create Site'
                variant='outline'
                Icon={Plus}
                onClick={() =>
                  setParams({
                    dialog: "create-site",
                    officeId: String(office.id),
                    officeName: office.name,
                  })
                }
              />
            </div>
          )}
        </div>

        {/* Both stay mounted so each keeps its filters and page. */}
        <TabsContent
          value='sites'
          forceMount
          className='p-4 data-[state=inactive]:hidden sm:p-6'>
          <OfficeSites details={details} />
        </TabsContent>
        <TabsContent
          value='work-orders'
          forceMount
          className='p-4 data-[state=inactive]:hidden sm:p-6'>
          <OfficeWorkOrders details={details} />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default OfficeTabs;
