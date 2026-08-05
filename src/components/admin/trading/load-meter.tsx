"use client";

import { Mono } from "@/components/admin/ui";
import { formatKg } from "@/lib/format-money";
import { cn } from "@/lib/utils";

/**
 * The truck load meter: planned weight against the truck's capacity as a
 * progress strip - green while it fits, red once over (mirroring the
 * backend's OVER_CAPACITY refusal). Without a capacity it degrades to a
 * plain total, so the figure is never hidden just because capacity is
 * unknown.
 */
export function LoadMeter({
  loadedKg,
  capacityKg,
  loadedLabel = "Selected",
  className,
}: {
  loadedKg: number;
  /** Truck capacity; null/undefined renders the total without a bar. */
  capacityKg: number | null | undefined;
  /** What the loaded figure represents ("Selected", "Allocated"). */
  loadedLabel?: string;
  className?: string;
}) {
  const hasCapacity = typeof capacityKg === "number" && capacityKg > 0;
  const over = hasCapacity && loadedKg > capacityKg;
  const pct = hasCapacity
    ? Math.min(100, (loadedKg / capacityKg) * 100)
    : 0;

  return (
    <div
      className={cn(
        "rounded-[6px] border px-3 py-2",
        over
          ? "border-console-red/60 bg-console-red/[0.05]"
          : "border-adm-line bg-adm-sunken",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px]">
        <span className="font-bold tracking-[0.09em] text-adm-muted uppercase text-[10.5px]">
          Truck load
        </span>
        <Mono
          className={cn("text-[12.5px]", over ? "text-console-red" : "text-adm-ink")}
        >
          {loadedLabel} {formatKg(loadedKg)}
          {hasCapacity ? <> / {formatKg(capacityKg)}</> : null}
        </Mono>
      </div>
      {hasCapacity ? (
        <>
          <div
            role="meter"
            aria-label="Truck load against capacity"
            aria-valuemin={0}
            aria-valuemax={capacityKg}
            aria-valuenow={loadedKg}
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-adm-sunken"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                over ? "bg-console-red" : "bg-console",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {over ? (
            <p role="alert" className="mt-1 text-[12px] font-medium text-console-red">
              Over capacity by {formatKg(loadedKg - capacityKg)} - lighten the
              load or raise the truck capacity.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
