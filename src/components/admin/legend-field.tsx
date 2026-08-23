"use client";

import { cn } from "@/lib/utils";

/**
 * A control that keeps its name once it has a value.
 *
 * A placeholder is the label until the moment somebody types, and then it is
 * gone: a row of filled boxes reading "Deposit", "80", "On arrival" says
 * nothing about which is which, and neither does an aria-label a sighted
 * reader never hears. The name sits in a notch in the field's own border
 * instead, so it is there while the box is empty, while it is being typed
 * into, and afterwards.
 *
 * The border lives on the fieldset and the control inside is bare, which is
 * what puts the legend IN the rule rather than above it. Focus is taken from
 * the control by focus-within, so the box still lights up as one thing.
 */
export function LegendField({
  children,
  className,
  invalid = false,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  /** Colours the rule, for a field the form has rejected. */
  invalid?: boolean;
  label: string;
}) {
  return (
    <fieldset
      className={cn(
        "min-w-0 rounded-none border bg-adm-card px-2 pb-1 transition-[border-color,box-shadow] focus-within:border-console focus-within:shadow-[0_0_0_3px_rgba(30,61,43,0.12)]",
        invalid ? "border-console-red" : "border-adm-line",
        className,
      )}
    >
      <legend className="ml-1 px-1 text-[9.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * The control inside a LegendField: no border, no ring, no height of its own.
 * The fieldset around it owns all three, so the two never draw two boxes.
 */
export const legendControlClass =
  "h-[26px] w-full min-w-0 rounded-none border-0 bg-transparent px-1 text-[12px] text-adm-ink shadow-none outline-none focus:border-0 focus:shadow-none focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0";
