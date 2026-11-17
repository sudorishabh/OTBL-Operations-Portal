import React from "react";
import Link from "next/link";
import { House } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// One step of a trail. Without an href it is the page being viewed.
export type Crumb = {
  label: string;
  href?: string;
};

type Tone = "light" | "dark";

// Light sits on the grey dashboard page; dark on the cyan operator header.
const TONES: Record<
  Tone,
  {
    trail: string;
    muted: string;
    link: string;
    page: string;
    separator: string;
  }
> = {
  light: {
    trail: "bg-white/75 shadow-sm ring-gray-300/60",
    muted: "text-gray-500",
    link: "text-gray-500 hover:text-emerald-700",
    page: "text-cyan-800",
    separator: "text-gray-400",
  },
  dark: {
    trail: "bg-white/10 ring-white/15",
    muted: "text-cyan-100/80",
    link: "text-cyan-100/80 hover:text-white focus-visible:ring-white/40",
    page: "text-white",
    separator: "text-cyan-200/50",
  },
};

interface Props {
  // The steps after home, ending with the page being viewed.
  items: Crumb[];
  // Where the house icon leads.
  home?: Required<Crumb>;
  tone?: Tone;
  className?: string;
}

const DEFAULT_HOME: Required<Crumb> = { label: "Overview", href: "/dashboard" };

// A page's place in the portal, from home to the page itself. On small
// screens only the parent and the page stay, the steps between fold into an
// ellipsis.
const PageBreadcrumbs = ({
  items,
  home = DEFAULT_HOME,
  tone = "light",
  className,
}: Props) => {
  const styles = TONES[tone];
  const isHomePage = items.length === 0;
  // Steps before the parent hide on small screens.
  const foldedCount = Math.max(items.length - 2, 0);

  const separator = (className?: string) => (
    <BreadcrumbSeparator className={cn(styles.separator, className)} />
  );

  return (
    <Breadcrumb
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-1 ring-1 backdrop-blur-sm",
        styles.trail,
        className,
      )}>
      <BreadcrumbList>
        <BreadcrumbItem className='shrink-0'>
          {isHomePage ? (
            <BreadcrumbPage
              className={cn("inline-flex items-center gap-1.5", styles.page)}>
              <House className='size-3.5' />
              {home.label}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink
              asChild
              className={cn("inline-flex items-center", styles.link)}>
              <Link
                href={home.href}
                title={home.label}>
                <House className='size-3.5' />
                <span className='sr-only'>{home.label}</span>
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {foldedCount > 0 && (
          <>
            {separator("sm:hidden")}
            <BreadcrumbItem className={cn("sm:hidden", styles.muted)}>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
          </>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFolded = index < foldedCount;

          return (
            <React.Fragment key={`${index}-${item.label}`}>
              {separator(isFolded ? "hidden sm:block" : undefined)}
              <BreadcrumbItem
                className={cn(
                  isLast
                    ? "max-w-[16rem] sm:max-w-sm"
                    : "max-w-[10rem] sm:max-w-[14rem]",
                  isFolded && "hidden sm:inline-flex",
                )}>
                {isLast ? (
                  <BreadcrumbPage
                    className={styles.page}
                    title={item.label}>
                    {item.label}
                  </BreadcrumbPage>
                ) : !item.href ? (
                  <span
                    className={cn("truncate font-medium", styles.muted)}
                    title={item.label}>
                    {item.label}
                  </span>
                ) : (
                  <BreadcrumbLink
                    asChild
                    className={styles.link}>
                    <Link
                      href={item.href}
                      title={item.label}>
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default PageBreadcrumbs;
