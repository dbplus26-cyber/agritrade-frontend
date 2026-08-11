"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A date input that always says what goes in it.
 *
 * Native date inputs ignore the `placeholder` attribute, and mobile browsers
 * render an EMPTY one as a blank box - so on a phone, half the console's date
 * fields looked like dead inputs. Same remedy as the toolbar's
 * ConsoleDateField: while empty and unfocused the native text is hidden and
 * our own placeholder overlays it; focusing (or picking a value) hands the
 * field back to the native editor.
 *
 * Works both controlled (`value`) and register-style uncontrolled
 * (react-hook-form spreads `onChange`/`onBlur`/`ref`). Emptiness comes from
 * the `value` prop when there is one; otherwise it is read back from the DOM
 * through the ref - react-hook-form writes its defaultValues through the ref
 * WITHOUT firing onChange, so change events alone would leave the overlay
 * sitting on top of a real value.
 */
export function DateInput({
  className,
  defaultValue,
  onBlur,
  onChange,
  placeholder = "Pick a date",
  ref,
  value,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  placeholder?: string;
}) {
  const [domEmpty, setDomEmpty] = React.useState(!defaultValue);
  const empty =
    value !== undefined ? value === "" || value === null : domEmpty;

  const composedRef = (el: HTMLInputElement | null) => {
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
    // Reconcile with what the DOM actually holds (identical-state updates
    // bail out, so this never loops).
    if (el && value === undefined) setDomEmpty(!el.value);
  };

  return (
    <span className="relative block w-full min-w-0">
      <Input
        {...props}
        ref={composedRef}
        type="date"
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          setDomEmpty(!e.target.value);
          onChange?.(e);
        }}
        onBlur={(e) => {
          setDomEmpty(!e.target.value);
          onBlur?.(e);
        }}
        className={cn(
          "peer",
          className,
          empty && "text-transparent focus:text-adm-ink",
        )}
      />
      {empty ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center truncate pr-10 text-[14px] text-adm-faint peer-focus:hidden"
        >
          {placeholder}
        </span>
      ) : null}
    </span>
  );
}
