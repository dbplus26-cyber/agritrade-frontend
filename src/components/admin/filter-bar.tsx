"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The console toolbar field: the stock register's compact boxed control —
 * square corners, paper fill, soil border. The border turns console-green
 * while focused/open and stays half-lit while the field holds a non-default
 * value, so active criteria read at a glance.
 */
const boxField = (active: boolean) =>
  cn(
    "flex h-[34px] w-full min-w-0 items-center rounded-[6px] border bg-adm-card transition-colors focus-within:border-console",
    active ? "border-console/60" : "border-adm-line",
  );

/** Dropdown filter in the console skin (aria-labelled; the value text —
 * "All roles", "Authentication" — carries the meaning, stock-register style). */
export function ConsoleLabeledSelect({
  label,
  value,
  onChange,
  options,
  active = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  /** True when the value is non-default — keeps the border half-lit. */
  active?: boolean;
  className?: string;
}) {
  return (
    // A NATIVE select, not a rendered one.
    //
    // The rendered version drew its own panel in a portal, and a portal has
    // no obligation to the control that opened it: it sized to the longest
    // option, so a 150px filter opened a list twice its width and a toolbar
    // of them came out ragged. Pinning the panel to the trigger fixed the
    // width and cost the thing a native control gives free - the platform's
    // own list, which is a wheel on a phone, is keyboard-navigable by typing,
    // and never escapes its own control.
    //
    // The label rides INSIDE the control as a prefix on the option text
    // instead of a separate span, because a native select renders one line of
    // text and cannot hold a second element.
    <label className={cn("relative flex min-w-0", className)}>
      <span className="sr-only">{`Filter by ${label.toLowerCase()}`}</span>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[10px] font-semibold tracking-[0.06em] text-adm-faint uppercase">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-[34px] w-full min-w-0 cursor-pointer appearance-none rounded-[6px] border bg-adm-card pr-7 text-[13px] font-normal text-adm-body transition-colors focus:ring-0 focus-visible:ring-0 lg:w-[150px]",
          active ? "border-console/60" : "border-adm-line",
        )}
        // Inline, not a class: Tailwind cannot build one from a runtime
        // value. Leaves room for the label prefix sitting over the control.
        style={{
          paddingLeft: `calc(0.625rem + ${String(label.length)}ch + 0.5rem)`,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-adm-faint"
      />
    </label>
  );
}

/**
 * Native date input for From/To windows, in the boxed toolbar shape with a
 * prefix naming the bound.
 *
 * Date inputs ignore the `placeholder` attribute, and mobile browsers render
 * an empty one as a blank box (desktop Chrome at least shows mm/dd/yyyy).
 * So while empty and unfocused we hide the native text and overlay our own
 * placeholder; focus (or a picked value) hands the field back to the native
 * editor.
 */
export function ConsoleDateField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "Any date",
  className,
}: {
  label: string;
  /** YYYY-MM-DD or "". */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        boxField(Boolean(value)),
        // Default desktop width so a date field can never wrap into a
        // full-width row of its own (the lg toolbar is flex-wrap).
        "cursor-pointer lg:w-[170px] lg:flex-none",
        className,
      )}
    >
      <span className="pointer-events-none flex-none pl-2.5 pr-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-adm-faint">
        {label}
      </span>
      <span className="relative h-full min-w-0 flex-1">
        <input
          type="date"
          value={value}
          min={min || undefined}
          max={max || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "peer h-full w-full cursor-pointer appearance-none bg-transparent pr-2 text-[13px] font-normal outline-none",
            value ? "text-adm-muted" : "text-transparent focus:text-adm-muted",
          )}
        />
        {!value && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[13px] text-adm-faint peer-focus:hidden"
          >
            {placeholder}
          </span>
        )}
      </span>
    </label>
  );
}

/**
 * A From/To window as ONE control, so the two bounds always read as a pair.
 *
 * Two loose `ConsoleDateField`s dropped into the filter bar's phone panel
 * flow into whatever cells are left, which put From at the end of one row
 * and To at the start of the next - and on a screen with an odd number of
 * other filters they never even lined up. This wrapper keeps them together:
 * `col-span-2` claims a whole row of the panel's 2-col grid (and of the
 * tablet 4-col grid), and inside it the two fields sit side by side from
 * 360px. Below that - Galaxy Fold and the like - a 2-up pair leaves each
 * field too narrow to show a date at all, so they stack.
 */
export function ConsoleDateRange({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "From",
  toLabel = "To",
  fieldClassName,
  className,
}: {
  /** YYYY-MM-DD or "". */
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Registers that name the dimension ("Added from"/"Added to"). */
  fromLabel?: string;
  toLabel?: string;
  /** Per-field width on the desktop row (e.g. "lg:w-[150px]"). */
  fieldClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "col-span-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:flex lg:flex-none",
        className,
      )}
    >
      {/* The bounds clamp each other so a window can never be inverted. */}
      <ConsoleDateField
        label={fromLabel}
        value={from}
        onChange={onFromChange}
        max={to || undefined}
        className={fieldClassName}
      />
      <ConsoleDateField
        label={toLabel}
        value={to}
        onChange={onToChange}
        min={from || undefined}
        className={fieldClassName}
      />
    </div>
  );
}

/**
 * The console list toolbar in the stock-register shape: one row of compact
 * boxed controls on the page ground.
 *
 * Desktop (lg+): the search box, then as many filters as the register
 * defines, Clear, and the persistent action pushed to the right edge.
 *
 * Tablet (md–lg): the search takes the full width on its own line; the
 * filters come down into an even grid capped at four columns, with the
 * action anchored at the right end of that row.
 *
 * Mobile: full-width search, then a "Filters" toggle with a mono
 * active-count revealing the filters as a two-column grid, the action
 * anchored beside the toggle.
 */
export function ConsoleFilterBar({
  search = "",
  onSearch,
  searchPlaceholder = "Search…",
  hideSearch = false,
  activeCount = 0,
  onClear,
  action,
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  /** Screens with nothing meaningful to search (stock) drop the box. */
  hideSearch?: boolean;
  /** Number of non-default filters, shown on the toggle. */
  activeCount?: number;
  /** Resets every filter (rendered only while any is active). */
  onClear?: () => void;
  /** Persistent action (e.g. "+ Add user"). */
  action?: ReactNode;
  /** ConsoleLabeledSelect / ConsoleDateField filters. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const searchField = hideSearch ? null : (
    <label
      className={cn(
        boxField(search.length > 0),
        "gap-1.5 px-2.5 lg:w-[280px] lg:flex-none xl:w-[320px]",
      )}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-none">
        <circle cx="7" cy="7" r="5" stroke="#a49b7e" strokeWidth="1.5" />
        <path d="M11 11l3.2 3.2" stroke="#a49b7e" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <Input
        type="search"
        value={search}
        onChange={(e) => onSearch?.(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="[&::-webkit-search-cancel-button]:hidden h-full w-full min-w-0 rounded-none border-0 bg-transparent p-0 text-[13px] text-adm-ink shadow-none outline-none placeholder:text-adm-faint focus-visible:ring-0 md:text-[13px]"
      />
      {search ? (
        <button
          type="button"
          onClick={() => onSearch?.("")}
          aria-label="Clear search"
          className="flex h-4 w-4 flex-none cursor-pointer items-center justify-center rounded-full text-adm-faint hover:bg-adm-sunken hover:text-adm-muted"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : null}
    </label>
  );

  const clearButton =
    onClear && activeCount > 0 ? (
      <button
        type="button"
        onClick={onClear}
        className="cursor-pointer whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.1em] text-console transition-colors hover:text-console-deep"
      >
        Clear filters
      </button>
    ) : null;

  return (
    <div className="mb-3">
      {/* ── Desktop: one row of boxed controls, action at the right edge ─── */}
      <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">
        {searchField}
        {children}
        {clearButton}
        <div className="ml-auto">{action}</div>
      </div>

      {/* ── Tablet: full-width search, filters down in a ≤4-col grid ─────── */}
      <div className="hidden md:block lg:hidden">
        {searchField}
        <div className="mt-2 flex items-center gap-2">
          <div className="grid flex-1 grid-cols-4 items-center gap-2">
            {children}
            {clearButton}
          </div>
          <div className="flex-none">{action}</div>
        </div>
      </div>

      {/* ── Mobile: search line, then toggle + action, then the panel ────── */}
      <div className="md:hidden">
        {searchField}
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="console-filters"
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[6px] border bg-adm-card px-2.5 text-[10.5px] uppercase tracking-[0.14em] transition-colors",
              open
                ? "border-console text-console"
                : "border-adm-line text-adm-muted hover:text-console",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 flex-none rotate-45 transition-colors",
                activeCount > 0 || open ? "bg-console" : "bg-console/40",
              )}
            />
            Filters
            {activeCount > 0 ? (
              <span className="font-adminmono text-[11px] font-bold text-console">
                {String(activeCount).padStart(2, "0")}
              </span>
            ) : null}
          </button>
          {action}
        </div>
        <div
          id="console-filters"
          className={cn("mt-2 grid-cols-2 gap-2", open ? "grid" : "hidden")}
        >
          {children}
          {clearButton ? <div className="col-span-2">{clearButton}</div> : null}
        </div>
      </div>
    </div>
  );
}
