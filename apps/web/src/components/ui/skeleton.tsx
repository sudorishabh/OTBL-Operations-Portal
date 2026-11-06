import { cn } from "@/lib/utils"

// Grey enough to read on white cards; pass a darker bg-* for bars sitting on
// the grey page background.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-gray-200 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
