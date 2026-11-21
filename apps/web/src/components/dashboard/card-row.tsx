import React from "react";
import { cn } from "@/lib/utils";

// The columns a wide screen splits the row into, one per card.
const WIDE_COLUMNS: Record<number, string> = {
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

// Same-sized cards kept on one line. Wide screens split the line between
// them; narrower ones scroll it sideways a card at a time, with the next
// card peeking in so it's clear there are more. The row reaches the page's
// edges while scrolling, so cards don't look cut off by its padding.
export const CardRow = ({
  label,
  children,
}: {
  // Names the row for screen readers.
  label: string;
  children: React.ReactNode;
}) => {
  const cards = React.Children.toArray(children);

  return (
    <div
      role='list'
      aria-label={label}
      className={cn(
        "-mx-3 flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-4 sm:scroll-px-4 sm:px-4 md:-mx-6 md:scroll-px-6 md:px-6 [&::-webkit-scrollbar]:hidden",
        "xl:mx-0 xl:grid xl:overflow-visible xl:px-0 xl:pb-0",
        WIDE_COLUMNS[cards.length],
      )}>
      {cards.map((card, index) => (
        <div
          key={index}
          role='listitem'
          className='w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[31%] xl:w-auto xl:min-w-0'>
          {card}
        </div>
      ))}
    </div>
  );
};
