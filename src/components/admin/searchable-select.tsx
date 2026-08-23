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
 *
 * ## Two search modes
 *
 * By default cmdk filters the `options` array in the browser, which is right
 * for a registry that fits in one fetch (warehouses, seasons).
 *
 * Pass `onSearchChange` for a register that grows without limit - suppliers,
 * farmers, buyers, plots. Local filtering there is a trap: the caller can
 * only fetch a page, so typing searches the page it happens to hold and
 * reports "no matches" for a record that exists, leaving it permanently
 * unselectable with no sign anything was missing. In this mode cmdk stops
 * filtering, the typed text goes to the caller to re-query the server, and
 * the list shows whatever came back.
 *
 * `selectedLabel` matters in that mode: the chosen record often is not on the
 * page currently loaded (editing a two-year-old purchase, say), and without
 * it the trigger would fall back to the placeholder and read as empty on a
 * field that is in fact set.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  emptyText = "No matches.",
  className,
  onSearchChange,
  loading = false,
  selectedLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  disabled?: boolean;
  emptyText?: string;
  className?: string;
  /** Switches to server-side search; receives the raw typed text. */
  onSearchChange?: (query: string) => void;
  /** True while the server-side query is in flight. */
  loading?: boolean;
  /** Label for `value` when it is not among the loaded `options`. */
  selectedLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const listId = React.useId();
  const remote = Boolean(onSearchChange);
  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label ?? (value ? selectedLabel : undefined);

  // Closing clears the query so the next open starts from the unfiltered
  // list rather than whatever was typed last time - in remote mode a stale
  // query would also mean the reopened list is somebody else's search.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && query) {
      setQuery("");
      onSearchChange?.("");
    }
  };

  return (
    <Popover modal open={open} onOpenChange={handleOpenChange}>
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
              "min-w-0 flex-1 line-clamp-1 whitespace-normal [overflow-wrap:break-word]",
              !triggerLabel && "text-adm-faint",
            )}
          >
            {triggerLabel ?? placeholder}
          </span>
          <ChevronDownIcon aria-hidden className="size-4 flex-none text-adm-faint" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        // z-[80]: above dialogs (z-50), the shell's bottom tab bar (z-[60])
        // and responsive bottom sheets (z-[70]).
        // Exactly the trigger's width, with no floor under it.
        //
        // No min-width: a min-width outranks the width beside it, so any
        // control narrower than the floor - a picker in a detail rail, one half
        // of a 2-up field pair on a phone - would open a panel wider than
        // itself, overhanging the control it belongs to. The 92vw cap stays
        // only as a last guard against a trigger that is itself near the screen
        // width.
        className="z-[80] w-[var(--radix-popover-trigger-width)] max-w-[92vw] min-w-0 rounded-none border-0 border-t-[1.5px] border-b-[3px] border-t-soil/50 border-b-forest bg-surface p-0 shadow-none ring-0"
      >
        {/* shouldFilter={false} in remote mode: the server has already
            decided what matches, and letting cmdk filter on top of it would
            hide rows the server deliberately returned. */}
        <Command
          className="rounded-none! bg-transparent p-0"
          shouldFilter={!remote}
        >
          <CommandInput
            autoFocus
            placeholder="Type to search…"
            value={remote ? query : undefined}
            onValueChange={
              remote
                ? (v) => {
                    setQuery(v);
                    onSearchChange?.(v);
                  }
                : undefined
            }
          />
          <CommandList id={listId} className="max-h-[min(40dvh,18rem)]">
            {/* "Searching" and "nothing found" are different answers, and
                saying "No matches" while the request is still out tells the
                user their record does not exist when it may well. */}
            <CommandEmpty className="py-5 text-center text-[13px] text-adm-muted">
              {loading ? "Searching…" : emptyText}
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
                className="rounded-none text-[13.5px]"
              >
                <span className="min-w-0 flex-1 text-adm-ink [overflow-wrap:break-word]">
                  {o.label}
                </span>
                {/* The hint has to be able to GIVE WAY.
                    Left flex-none, a long one takes whatever width it wants
                    and squeezes the label beside it - and the label wraps with
                    `overflow-wrap: anywhere`, whose min-content is a single
                    character, so a plot reference next to a long location
                    comes out as one letter per line, reading vertically down
                    the row. Capped at 40% and truncating, the label always
                    keeps the greater share. */}
                {o.hint ? (
                  <span
                    className="ml-auto max-w-[40%] flex-none truncate pl-2 text-right text-[12px] text-adm-muted/80"
                    title={o.hint}
                  >
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
