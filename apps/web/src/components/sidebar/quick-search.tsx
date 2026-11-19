"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import { CornerDownLeft, LoaderCircle, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import RecordCode from "@/components/shared/record-code";
import { navHref, type NavItem } from "@/components/sidebar/nav-links";
import {
  MIN_SEARCH_LENGTH,
  useRecordSearch,
  type SearchResult,
} from "@/components/sidebar/use-record-search";
import { cn } from "@/lib/utils";

type Option = SearchResult & {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type OptionGroup = { label: string; options: Option[] };

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className='inline-flex h-4.5 min-w-4.5 items-center justify-center rounded border border-gray-300 bg-white px-1 font-sans text-[10px] font-medium text-gray-500'>
    {children}
  </kbd>
);

// The search box and what it finds: the user's pages by name and, from a
// couple of letters, records in the sections they can open. Arrows move
// through the results and Enter opens one.
const SearchPanel = ({
  pages,
  onDone,
}: {
  pages: NavItem[];
  onDone: () => void;
}) => {
  const router = useRouter();
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);

  const links = useMemo(() => pages.map((page) => page.link), [pages]);
  const { sections, ready, isSearching, failed } = useRecordSearch(
    search,
    links,
  );

  const term = search.trim().toLowerCase();
  const iconFor = (link: string) =>
    pages.find((page) => page.link === link)?.icon ?? Search;

  const groups: OptionGroup[] = [
    {
      label: "Pages",
      options: pages
        .filter((page) => page.title.toLowerCase().includes(term))
        .map((page) => ({
          key: `page-${page.link}`,
          title: page.title,
          href: navHref(page.link),
          icon: page.icon,
        })),
    },
    ...sections.map((section) => ({
      label: section.label,
      options: section.results.map((result) => ({
        ...result,
        icon: iconFor(section.link),
      })),
    })),
  ].filter((group) => group.options.length > 0);

  const options = groups.flatMap((group) => group.options);
  const activeIndex = Math.min(active, options.length - 1);

  // Keep the highlighted result in view as the arrows move it.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const openOption = (option: Option) => {
    onDone();
    router.push(option.href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (options.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) openOption(option);
    }
  };

  const emptyMessage = isSearching
    ? "Searching…"
    : ready
      ? `Nothing matches “${search.trim()}”.`
      : "No page by that name. Keep typing to search records.";

  return (
    <>
      <div className='flex items-center gap-2.5 border-b border-gray-200 px-4'>
        <Search className='size-4 shrink-0 text-gray-400' />
        <input
          autoFocus
          type='text'
          role='combobox'
          aria-expanded='true'
          aria-controls={listId}
          aria-autocomplete='list'
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder='Search pages, work orders, clients, offices…'
          className='h-12 min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400'
        />
        {isSearching && (
          <LoaderCircle
            aria-hidden='true'
            className='size-4 shrink-0 animate-spin text-gray-400'
          />
        )}
      </div>

      <div
        ref={listRef}
        id={listId}
        role='listbox'
        aria-label='Results'
        className='min-h-0 flex-1 overflow-y-auto p-2'>
        {groups.map((group) => (
          <div
            key={group.label}
            role='group'
            aria-label={group.label}
            className='pb-1'>
            <div className='px-2.5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-400'>
              {group.label}
            </div>
            {group.options.map((option) => {
              const index = options.indexOf(option);
              const isActive = index === activeIndex;

              return (
                <Link
                  key={option.key}
                  id={`${listId}-${index}`}
                  href={option.href}
                  role='option'
                  aria-selected={isActive}
                  data-active={isActive}
                  tabIndex={-1}
                  onClick={onDone}
                  onMouseMove={() => setActive(index)}
                  className='group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-gray-700 outline-none data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-900'>
                  <span className='flex size-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 group-data-[active=true]:border-emerald-200 group-data-[active=true]:text-emerald-700'>
                    <option.icon className='size-4' />
                  </span>
                  <span className='grid min-w-0 flex-1 leading-tight'>
                    <span className='flex min-w-0 items-center gap-2'>
                      <span className='truncate font-medium'>
                        {option.title}
                      </span>
                      {option.code && <RecordCode code={option.code} />}
                    </span>
                    {option.detail && (
                      <span className='truncate text-xs text-gray-500'>
                        {option.detail}
                      </span>
                    )}
                  </span>
                  <CornerDownLeft
                    aria-hidden='true'
                    className='size-3.5 shrink-0 text-emerald-600 opacity-0 group-data-[active=true]:opacity-100'
                  />
                </Link>
              );
            })}
          </div>
        ))}

        {options.length === 0 && (
          <p className='px-2.5 py-8 text-center text-sm text-gray-500'>
            {emptyMessage}
          </p>
        )}

        {failed && !isSearching && (
          <p
            role='status'
            className='px-2.5 pt-1 pb-2 text-xs text-rose-600'>
            Some records couldn&apos;t be searched just now. Try again in a
            moment.
          </p>
        )}

        {!ready && options.length > 0 && (
          <p className='px-2.5 pt-1 pb-2 text-xs text-gray-400'>
            Type {MIN_SEARCH_LENGTH} or more letters to search records by name
            or code too.
          </p>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-200 bg-gray-50 px-4 py-2 text-[11px] text-gray-500'>
        <span className='inline-flex items-center gap-1'>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          to move
        </span>
        <span className='inline-flex items-center gap-1'>
          <Kbd>↵</Kbd>
          to open
        </span>
        <span className='inline-flex items-center gap-1'>
          <Kbd>Esc</Kbd>
          to close
        </span>
      </div>
    </>
  );
};

// A search row at the top of the sidebar, also opened with Ctrl/⌘ + K, that
// jumps straight to a page or record.
export const QuickSearch = ({
  pages,
  className,
}: {
  // The pages the user can open, as the sidebar lists them.
  pages: NavItem[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((isOpen) => !isOpen);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip='Search (Ctrl+K)'
          onClick={() => setOpen(true)}
          className={cn(
            className,
            "bg-white/8 text-sidebar-foreground/70 ring-1 ring-white/10",
          )}>
          <Search />
          <span>Search…</span>
          <kbd className='ml-auto rounded border border-sidebar-border px-1 font-sans text-[10px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden in-data-[mobile=true]:hidden'>
            Ctrl K
          </kbd>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Dialog
        open={open}
        onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className='top-[12dvh] flex max-h-[min(34rem,76dvh)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-xl'>
          <DialogTitle className='sr-only'>Search the portal</DialogTitle>
          <DialogDescription className='sr-only'>
            Find a page, work order, client, office or vendor and open it.
          </DialogDescription>
          <SearchPanel
            pages={pages}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
