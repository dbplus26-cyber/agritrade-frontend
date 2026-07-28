"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { adminSelectClass } from "@/components/admin/ui";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Muted, right-aligned context (community, unit label, location...). */
  hint?: string;
}

/**
 * The console's entity picker: a Popover + Command combobox worn as the
 * standard boxed field (`adminSelectClass`), for lists too long to scan in a
 * native select (farmers, buyers, plots...). Typing filters by label and
 * hint; the selected option's label shows in the trigger.
 *
 * Optional fields keep their "none" semantics by passing an explicit
 * `{ value: "", label: "..." }` option, mirroring the native
 * `<option value="">` they replace.
 *
 * Works inside dialogs and bottom sheets: the popover is `modal`, so its
 * portaled content stays interactive above a modal dialog's overlay (both
 * layers are z-50; the popover portal mounts later, so it paints on top).
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  emptyText = "No matches.",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  disabled?: boolean;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const selected = options.find((o) => o.value === value);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          className={cn(
            adminSelectClass,
            "flex w-full min-w-0 items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 line-clamp-1 whitespace-normal [overflow-wrap:anywhere]",
              !selected && "text-soil/55",
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDownIcon aria-hidden className="size-4 flex-none text-soil/70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        // z-[80]: above dialogs (z-50), the shell's bottom tab bar (z-[60])
        // and responsive bottom sheets (z-[70]).
        className="z-[80] w-[var(--radix-popover-trigger-width)] min-w-[min(92vw,240px)] max-w-[min(92vw,26rem)] rounded-[2px] border-[1.5px] border-soil/35 bg-paper p-0 shadow-doc ring-0"
      >
        <Command className="rounded-[2px]! bg-transparent p-0">
          <CommandInput autoFocus placeholder="Type to search..." />
          <CommandList id={listId} className="max-h-[min(40dvh,18rem)]">
            <CommandEmpty className="py-5 text-center text-[13px] text-soil">
              {emptyText}
            </CommandEmpty>
            {options.map((o) => (
              <CommandItem
                key={o.value}
                // cmdk matches on this string; the id tail keeps duplicate
                // labels from colliding in cmdk's internal value map.
                value={`${o.label} ${o.hint ?? ""} ${o.value}`.trim()}
                data-checked={o.value === value}
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="rounded-[2px] text-[13.5px]"
              >
                <span className="min-w-0 flex-1 text-ink [overflow-wrap:anywhere]">
                  {o.label}
                </span>
                {o.hint ? (
                  <span className="ml-auto flex-none pl-2 text-right text-[12px] text-soil/80">
                    {o.hint}
                  </span>
                ) : null}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
