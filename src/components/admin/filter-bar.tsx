"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    "flex h-[34px] w-full min-w-0 items-center rounded-none border bg-adm-card transition-colors focus-within:border-console",
    active ? "border-console/60" : "border-adm-line",
  );

/**
 * The label ABOVE a toolbar box, in the form-field idiom (dms convention).
 *
 * It used to ride INSIDE the box as an uppercase prefix beside the value,
 * and the two competed for the same 190px: long pairs ("SETTLEMENT" +
 * "All statuses") cramped, wrapped, and left one filter taller than its
 * neighbours. On top, each line owns its own room - the label names the
 * dimension, the box carries only the value.
 */
const fieldLabel =
  "mb-1 flex items-center gap-1 text-[12px] font-semibold text-adm-ink";

/** Dropdown filter in the console skin: label on top, the value text alone
 * in the box ("All roles", "Authentication" carries the meaning). */
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
   * Shown as a tooltip beside the label, exactly like a form field's.
   */
  hint?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className={fieldLabel}>
        <span className="min-w-0 truncate">{label}</span>
        {hint ? (
          <HelpTip label={`What does the ${label} filter do?`} text={hint} />
        ) : null}
      </span>
      {/* A RENDERED select (ui/select), not a native one: the rendered panel
          pins to the trigger's width and opens the same squared sheet as
          every other dropdown in the console. */}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          unstyled
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn(
            boxField(active),
            "cursor-pointer justify-between gap-1.5 pr-2 pl-2.5 text-[13px] font-normal text-adm-body [&_svg]:size-3.5 [&_svg]:text-adm-faint",
          )}
        >
          <span className="min-w-0 truncate text-left">
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
    <div className={cn("min-w-0", className)}>
      <span className={fieldLabel}>
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <label className={cn(boxField(Boolean(value)), "cursor-pointer px-2.5")}>
        <span className="relative h-full w-full min-w-0">
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
    </div>
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
        // UNNAMED container queries: inside ConsoleFilterBar the nearest
        // container is the toolbar itself (right - the pair must stay in step
        // with the toolbar's own grid); on the statement screens, which drop
        // this straight into a document header, it falls back to the shell's
        // main container and still pairs up wherever there is room.
        "col-span-1 grid grid-cols-1 gap-2 @min-[320px]:col-span-2 @min-[320px]:grid-cols-2",
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
  fullWidthSearch = false,
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
  /**
   * Search takes the toolbar's whole width instead of the ~30% band.
   *
   * For toolbars embedded in a SPLIT page (the expense-category statement,
   * anything living in one column of a DetailShell): the 30% band is sized
   * for a register that owns the full content width, and inside a half-width
   * column it left a stubby box with the filters wrapping awkwardly beside
   * the gap. Full width lets the search own its row and the filters file
   * underneath it.
   */
  fullWidthSearch?: boolean;
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
        // toolbar's width, floored so it never collapses to a stub on a
        // half-width content area and it keeps its placeholder readable.
        !fullWidthSearch &&
          "@min-[680px]/toolbar:w-[30%] @min-[680px]/toolbar:min-w-[240px] @min-[680px]/toolbar:flex-none",
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
        // The 34px line matches the filter boxes, so inside a cell whose
        // neighbours are label-over-box stacks it sits level with the boxes.
        className="flex h-[34px] cursor-pointer items-center text-[10.5px] font-bold tracking-[0.1em] whitespace-nowrap text-console uppercase transition-colors hover:text-console-deep"
      >
        Clear filters
      </button>
    ) : null;

  return (
    // Its OWN container. These queries used to point at the shell's /main,
    // which is the full content width - so a toolbar embedded in one column
    // of a split page was laid out for room it did not have.
    <div className="@container/toolbar mb-3">
      {/* ── Band one: search left, the page's action at the right edge ───── */}
      <div className="flex flex-col gap-2 @min-[680px]/toolbar:flex-row @min-[680px]/toolbar:items-center">
        {/* Narrow: search and the Filters toggle share ONE row - the box
            shrinks (min-w-0) and the toggle keeps its width. Wide: the
            wrapper dissolves (contents) so the original bands hold. */}
        <div className="flex items-center gap-2 @min-[680px]/toolbar:contents">
          {searchField}
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
                "inline-flex h-[34px] flex-none cursor-pointer items-center gap-1.5 rounded-none border bg-adm-card px-2.5 text-[10.5px] tracking-[0.14em] whitespace-nowrap uppercase transition-colors @min-[680px]/toolbar:hidden",
                open
                  ? "border-console text-console"
                  : "border-adm-line text-adm-muted hover:text-console",
              )}
            >
              <SlidersHorizontal
                aria-hidden="true"
                className={cn(
                  "size-3.5 flex-none transition-colors",
                  activeCount > 0 || open ? "text-console" : "text-adm-faint",
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
        </div>
        {action ? (
          <div className="flex justify-end @min-[680px]/toolbar:ml-auto">
            {action}
          </div>
        ) : null}
      </div>

      {/* ── Band two: the filters ────────────────────────────────────────── */}
      {hasFilters ? (
        <div
          id="console-filters"
          className={cn(
            "mt-2 grid grid-cols-1 gap-2 @min-[320px]/toolbar:grid-cols-2 @min-[520px]/toolbar:grid-cols-3",
            // Wide: fixed 190px tracks instead of equal fractions. Equal
            // fractions stretch three filters across a 1300px console into
            // 430px boxes, which is not the compact register control this is
            // meant to be; auto-fill keeps them 190px, aligned in columns, and
            // simply leaves the remainder of the row empty.
            "@min-[680px]/toolbar:grid-cols-[repeat(auto-fill,minmax(150px,190px))]",
            // The toolbar owns the widths, hence `!`. Callers still pass
            // `lg:w-[150px]`-style hints from the old wrapping row; left alone
            // those fire on VIEWPORT width and hand a filter a width narrower
            // than the cell it sits in, which is what left the select chevron
            // (pinned to the cell) hanging outside the control's visible box.
            "[&>*]:w-full!",
            // Closed on a narrow toolbar, always open once there is room.
            open ? "grid" : "hidden @min-[680px]/toolbar:grid",
          )}
        >
          {children}
          {/* Flows into the next free cell, so it sits beside the filters when
              the row has room and drops below them when it does not. */}
          {clearButton ? (
            <div className="col-span-1 flex items-end">{clearButton}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
