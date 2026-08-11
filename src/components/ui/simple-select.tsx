"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SimpleSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * THE dropdown for picking a value, everywhere.
 *
 * One rendered control wrapping ui/select, so every dropdown in the system
 * opens the same squared panel as the account menu - the same top hairline,
 * the same forest base rule, no shadow - instead of the platform's own
 * picker. Native `<select>`s used to sit beside rendered ones and every OS
 * drew its popup differently; this is the replacement for all of them.
 *
 * Drop-in for a styled native select: string value in, string value out.
 * Pass the same field class the native select wore (adminSelectClass, a form
 * input class) via `className` - the trigger is unstyled and the caller's
 * class is the whole box, so the control keeps its exact place in the form.
 *
 * An empty `value` renders the `placeholder` (Radix reserves the empty
 * string), so `<option value="">Choose…</option>` maps to `placeholder`.
 */
export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  disabled = false,
  id,
  ariaLabel,
  ariaInvalid,
  className,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  options: readonly SimpleSelectOption[];
  /** Shown while no value is picked (the old empty first option's text). */
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  /** The field box - typically the exact class the native select carried. */
  className?: string;
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        unstyled
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn(
          "w-full cursor-pointer justify-between gap-1.5 text-left [&>span]:min-w-0 [&>span]:truncate",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
