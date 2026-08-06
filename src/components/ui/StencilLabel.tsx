import { cn } from "@/lib/utils";

/** Stencilled utility text - eyebrows, tags, file labels. */
export function StencilLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "stencil text-[11px] leading-none tracking-[0.28em] text-harvest-deep",
        className,
      )}
    >
      {children}
    </span>
  );
}
