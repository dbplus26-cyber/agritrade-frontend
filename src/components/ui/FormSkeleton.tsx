import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading shape for form documents: label/input pairs inside the same
 * DocCard silhouette the real form renders, so nothing shifts on load.
 */
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "shadow-doc border border-soil/35 bg-surface-alt",
        className,
      )}
    >
      <div className="flex items-baseline justify-between border-b-[1.5px] border-soil/50 px-6 py-4">
        <Skeleton className="h-3.5 w-32 rounded-[2px]" />
        <Skeleton className="h-3 w-14 rounded-[2px]" />
      </div>
      <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-2.5 w-24 rounded-[2px]" />
            <Skeleton
              className={cn(
                "rounded-[2px]",
                i === fields - 1 ? "h-24" : "h-11",
              )}
            />
          </div>
        ))}
        <Skeleton className="h-12 w-40 rounded-[2px]" />
      </div>
    </div>
  );
}
