"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { HelpTip } from "@/components/admin/help-tip";
import { cn } from "@/lib/utils";

/**
 * The console toolbar field: the stock register's compact boxed control -
 * square corners, paper fill, soil border. The border turns console-green
 * while focused/open and stays half-lit while the field holds a non-default
 * value, so active criteria read at a glance.
 *
 * Every toolbar control wears this SAME box, and the box is the outer
 * `<label>`, never the inner input. A control that draws its own border
 * inside a wider label leaves the label's absolutely positioned furniture
 * (the select chevron) hanging off the end of the visible box, which is
 * exactly the bug this file used to ship.
 */
const boxField = (active: boolean) =>
  cn(
    "flex h-[34px] w-full min-w-0 items-center rounded-[6px] border bg-adm-card transition-colors focus-within:border-console",
    active ? "border-console/60" : "border-adm-line",
  );

/**
 * The label prefix riding inside a toolbar box ("STATUS", "ADDED FROM").
 *
 * It SHRINKS and truncates rather than holding its full width. The value is
 * what carries the meaning here ("All statuses" says it) and the prefix is
 * only a reminder of the dimension, so when a control gets tight the prefix
 * gives up its room first and the value keeps a readable floor. A `flex-none`
 * prefix instead pushed the value - and, on a date input, the browser's own
 * picker glyph - straight out of the box on a narrow column.
 */
const fieldPrefix =
  "min-w-0 shrink truncate text-[10px] font-semibold tracking-[0.06em] text-adm-faint uppercase";

/** Dropdown filter in the console skin (aria-labelled; the value text -
 * "All roles", "Authentication" - carries the meaning, stock-register style). */
export function ConsoleLabeledSelect({
  label,
  value,
  onChange,
  options,
  active = false,
  className,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  /** True when the value is non-default - keeps the border half-lit. */
  active?: boolean;
  className?: string;
  /**
   * One sentence on what narrowing by this actually does, for the filters
   * whose effect a reader cannot guess from the option names ("Source",
   * "Rail", "Basis"). Most filters need nothing: "All statuses" says it.
   *
   * The icon sits OUTSIDE the `<label>` on purpose. Anything clicked inside a
   * label is forwarded to that label's control, so a help button in there
   * would open the select every time somebody asked what the filter meant.
   */
  hint?: string;
}) {
  if (hint) {
    return (
      <span className={cn("flex min-w-0 items-center gap-1", className)}>
        <ConsoleLabeledSelect
          label={label}
          value={value}
          onChange={onChange}
          options={options}
          active={active}
          className="min-w-0 flex-1"
        />
        <HelpTip label={`What does the ${label} filter do?`} text={hint} />
      </span>
    );
  }
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
    // The label rides INSIDE the box as a prefix beside the select, because a
    // native select renders one line of text and cannot hold a second element.
    //
    // It is a FLEX SIBLING of the select, not an absolutely positioned overlay
    // with the select's `padding-left` guessed from `label.length` in `ch`.
    // That guess was wrong in both directions: `ch` measures the digit zero in
    // the SELECT's 13px font while the prefix renders in a 10px uppercase
    // semibold face with 0.06em tracking, so wide labels ("WAREHOUSE",
    // "MOVEMENT TYPE") under-reserved and ran under the option text, and short
    // ones over-reserved and squeezed the option text into nothing. Laying the
    // two out in a flex row makes the reservation exact and free.
    <label
      className={cn(
        boxField(active),
        // `relative` for the chevron, and `pr-6` is its reserved track: the
        // select's own box now ends before the glyph instead of running under
        // it. The chevron is pinned to THIS element, which is why the select
        // must fill it (`grow`) and must never carry a width of its own: a
        // 150px select inside a 200px label put the chevron 50px past the
        // control's visible right edge, floating on the page ground.
        "relative cursor-pointer gap-1.5 pr-6 pl-2.5",
        className,
      )}
    >
      <span className="sr-only">{`Filter by ${label.toLowerCase()}`}</span>
      <span aria-hidden="true" className={fieldPrefix}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // `grow shrink-0 basis-20`, not `flex-1`: the select claims a 5rem
        // floor and never gives it back, so a tight box takes its room out of
        // the prefix (which truncates) instead of squeezing the option text to
        // nothing. Written as three longhands because the `flex` shorthand
        // would race the individual properties in the stylesheet.
        className="h-full min-w-0 shrink-0 grow basis-20 cursor-pointer appearance-none border-0 bg-transparent text-[13px] font-normal text-adm-body outline-none focus:ring-0 focus-visible:ring-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-adm-faint"
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
    // No width of its own: the toolbar row that holds it decides how wide it
    // is (see ConsoleFilterBar). A field that set its own desktop width sat
    // narrower than the grid cell it lived in and left the row ragged.
    <label className={cn(boxField(Boolean(value)), "cursor-pointer", className)}>
      <span aria-hidden="true" className={cn(fieldPrefix, "pr-1.5 pl-2.5")}>
        {label}
      </span>
      {/* Same floor-and-truncate split as the select: a rendered date needs
          about 6rem for "mm/dd/yyyy", so it holds that and the prefix is what
          gives way on a narrow column. */}
      <span className="relative h-full min-w-0 shrink-0 grow basis-24">
        <input
          type="date"
          value={value}
          min={min || undefined}
          max={max || undefined}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={cn(
            "peer h-full w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-2 text-[13px] font-normal outline-none",
            // The browser's picker glyph is laid out INSIDE the input as an
            // unshrinkable flex item next to the date segments, so on a narrow
            // column it is the first thing pushed past the border: the icon
            // renders outside the box. Taking it out of flow (absolute, over
            // the whole field) removes it from that fight entirely, and
            // stretching it means a tap anywhere in the field opens the
            // picker, which is what a finger expects from a box this small.
            "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
            value ? "text-adm-muted" : "text-transparent focus:text-adm-muted",
          )}
        />
        {!value && (
          // `right-0` + truncate: the overlay is bounded by the field, so a
          // longer placeholder ("Any settlement date") clips instead of
          // spilling over the border.
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 left-0 flex items-center truncate text-[13px] text-adm-faint peer-focus:hidden"
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
 * Two loose `ConsoleDateField`s dropped into the filter bar's panel flow into
 * whatever cells are left, which put From at the end of one row and To at the
 * start of the next - and on a screen with an odd number of other filters they
 * never even lined up. This wrapper keeps them together: it claims two cells
 * of the toolbar's grid wherever the grid has two to give, and inside it the
 * two fields sit side by side. On a one-column toolbar (a phone under ~350px)
 * it claims one cell and the fields stack, because a 2-up pair there leaves
 * each field too narrow to render a date at all.
 *
 * The spans are CONTAINER queries against the console shell's `@container/main`
 * and they must stay in step with the grid in ConsoleFilterBar: a `col-span-2`
 * against a single-column grid invents an implicit second column and pushes
 * the page into horizontal scroll.
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
  /** Extra classes for each field (the toolbar sets the widths). */
  fieldClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "col-span-1 grid grid-cols-1 gap-2 @min-[320px]/main:col-span-2 @min-[320px]/main:grid-cols-2",
        // Same reason as the toolbar grid: the pair owns its own widths so the
        // two bounds always match each other and the filters beside them.
        "[&>*]:w-full!",
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
 * The console list toolbar in the stock-register shape, in TWO bands under the
 * page heading rather than one wrapping row.
 *
 * Wide (container ≥680px): band one is the search box held to ~30% of the
 * content width on the left with the page's action pinned to the right end of
 * the same line; band two is the filters, in a grid of compact 190px tracks
 * directly below. Splitting them stops a register with five filters from
 * shoving its "+ Add" button onto a second ragged line, and gives the eye one
 * fixed place to look for search and one for criteria.
 *
 * Narrow (container <680px): unchanged compact behaviour - full-width search,
 * then a "Filters" toggle with a mono active-count beside the action, the
 * filters themselves folded away behind it.
 *
 * The switch is a CONTAINER query, not `lg:`. The sidebar takes 224px, so a
 * viewport-based `lg:` fires while the content area is still ~750px, and the
 * two-band layout would appear (or not) based on a width this toolbar does not
 * actually have.
 *
 * The children are rendered ONCE. The three copies this used to keep (desktop
 * row, tablet grid, phone panel) meant three live copies of every select in
 * the DOM, each with the same accessible name.
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
  const hasFilters = Boolean(children);

  const searchField = hideSearch ? null : (
    <label
      className={cn(
        boxField(search.length > 0),
        "gap-1.5 px-2.5",
        // Band one on a wide toolbar: "a little long", about 30% of the
        // content width, floored so it never collapses to a stub on a
        // half-width content area and it keeps its placeholder readable.
        "@min-[680px]/main:w-[30%] @min-[680px]/main:min-w-[240px] @min-[680px]/main:flex-none",
      )}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="flex-none"
      >
        <circle cx="7" cy="7" r="5" stroke="#a49b7e" strokeWidth="1.5" />
        <path
          d="M11 11l3.2 3.2"
          stroke="#a49b7e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <Input
        type="search"
        value={search}
        onChange={(e) => onSearch?.(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="h-full w-full min-w-0 rounded-none border-0 bg-transparent p-0 text-[13px] text-adm-ink shadow-none outline-none placeholder:text-adm-faint focus-visible:ring-0 md:text-[13px] [&::-webkit-search-cancel-button]:hidden"
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
        className="cursor-pointer text-[10.5px] font-bold tracking-[0.1em] whitespace-nowrap text-console uppercase transition-colors hover:text-console-deep"
      >
        Clear filters
      </button>
    ) : null;

  return (
    <div className="mb-3">
      {/* ── Band one: search left, the page's action at the right edge ───── */}
      <div className="flex flex-col gap-2 @min-[680px]/main:flex-row @min-[680px]/main:items-center">
        {searchField}
        <div className="flex items-center gap-2 @min-[680px]/main:ml-auto">
          {hasFilters ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="console-filters"
              // Narrow only. `display:none` also takes it off the a11y tree,
              // which is what we want: on a wide toolbar the filters are
              // always on screen, so a control claiming to expand them would
              // be describing something that never happens.
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-2 rounded-[6px] border bg-adm-card px-2.5 text-[10.5px] tracking-[0.14em] whitespace-nowrap uppercase transition-colors @min-[680px]/main:hidden",
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
          ) : null}
          {action ? <div className="ml-auto">{action}</div> : null}
        </div>
      </div>

      {/* ── Band two: the filters ────────────────────────────────────────── */}
      {hasFilters ? (
        <div
          id="console-filters"
          className={cn(
            "mt-2 grid grid-cols-1 gap-2 @min-[320px]/main:grid-cols-2 @min-[520px]/main:grid-cols-3",
            // Wide: fixed 190px tracks instead of equal fractions. Equal
            // fractions stretch three filters across a 1300px console into
            // 430px boxes, which is not the compact register control this is
            // meant to be; auto-fill keeps them 190px, aligned in columns, and
            // simply leaves the remainder of the row empty.
            "@min-[680px]/main:grid-cols-[repeat(auto-fill,minmax(150px,190px))]",
            // The toolbar owns the widths, hence `!`. Callers still pass
            // `lg:w-[150px]`-style hints from the old wrapping row; left alone
            // those fire on VIEWPORT width and hand a filter a width narrower
            // than the cell it sits in, which is what left the select chevron
            // (pinned to the cell) hanging outside the control's visible box.
            "[&>*]:w-full!",
            // Closed on a narrow toolbar, always open once there is room.
            open ? "grid" : "hidden @min-[680px]/main:grid",
          )}
        >
          {children}
          {/* Flows into the next free cell, so it sits beside the filters when
              the row has room and drops below them when it does not. */}
          {clearButton ? (
            <div className="col-span-1 flex items-center">{clearButton}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
