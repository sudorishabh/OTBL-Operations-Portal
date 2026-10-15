"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Content shorter than this is shown whole; hiding half of it saves little.
const MIN_COLLAPSIBLE_HEIGHT = 160;

interface Props {
  children: React.ReactNode;
  // Text on the bottom bar that shows everything.
  expandLabel: string;
  className?: string;
}

// Shows the top half of its content, blurring into the bottom edge. Clicking
// the edge shows it all until focus moves elsewhere.
const CollapsiblePreview = ({ children, expandLabel, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullHeight, setFullHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => setFullHeight(content.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const canCollapse =
    fullHeight !== null && fullHeight > MIN_COLLAPSIBLE_HEIGHT;
  const isCollapsed = canCollapse && !isExpanded;

  const expand = () => {
    setIsExpanded(true);
    // Holding focus is what keeps it open; leaving collapses it again.
    containerRef.current?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsExpanded(false);
        }
      }}
      className={cn("relative outline-none", className)}>
      <div
        className='overflow-hidden transition-[max-height] duration-300 ease-out'
        style={
          canCollapse
            ? { maxHeight: isCollapsed ? fullHeight / 2 : fullHeight }
            : undefined
        }>
        <div ref={contentRef}>{children}</div>
      </div>

      {isCollapsed && (
        <button
          type='button'
          onClick={expand}
          aria-expanded={false}
          className='group absolute inset-x-0 bottom-0 flex h-24 cursor-pointer items-end justify-center pb-3'>
          <span className='pointer-events-none absolute inset-0 bg-linear-to-b from-white/0 via-white/70 to-white backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,transparent,black_60%)]' />
          <span className='relative inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm transition-colors group-hover:border-gray-300 group-hover:text-gray-900'>
            {expandLabel}
            <ChevronDown className='size-3.5' />
          </span>
        </button>
      )}
    </div>
  );
};

export default CollapsiblePreview;
