import { cn } from "@/lib/utils";

export type StatusBadgeVariant =
  /** Gold tag with the nail dot - live from records ("AVAILABLE NOW"). */
  | "gold"
  /** Dashed outline - never disappears, degrades to "ASK US". */
  | "dashed"
  /** Solid leaf - positive states ("AVAILABLE"). */
  | "leaf"
  /** Solid soil - held states ("RESERVED"). */
  | "soil"
  /** Error - failed states only. */
  | "error";

/**
 * The stencilled status tag from the availability board. The gold variant
 * carries the little nail head that "pins" it to the plank.
 *
 * Tags never wrap: every one of them is a two-word status ("AVAILABLE NOW",
 * "ASK US") and a printed tag that breaks mid-phrase reads as a mistake. The
 * board reserves room for the tag rather than letting it fold.
 */
export function StatusBadge({
  variant = "gold",
  nailed = variant === "gold",
  className,
  children,
}: {
  variant?: StatusBadgeVariant;
  /** Show the nail-head dot (gold board tags have it, inline chips don't). */
  nailed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "stencil relative inline-block whitespace-nowrap rounded-[2px] px-3.5 py-2 text-[11px] leading-none tracking-[0.18em]",
        variant === "gold" &&
          "bg-harvest text-ink shadow-[2px_3px_0_rgb(0_0_0/0.4)]",
        variant === "dashed" &&
          "border-[1.5px] border-dashed border-surface/50 text-surface/80",
        variant === "leaf" && "bg-leaf text-surface",
        variant === "soil" && "bg-soil text-surface",
        variant === "error" && "bg-error text-surface",
        className,
      )}
    >
      {nailed ? (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[3px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#6b4f1c] shadow-[inset_0_1px_1px_rgb(0_0_0/0.5)]"
        />
      ) : null}
      {children}
    </span>
  );
}
