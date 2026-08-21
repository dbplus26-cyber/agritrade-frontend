"use client";

import { Children, useId, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X, type LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { AdminButton } from "@/components/admin/ui";
import { HelpTip } from "@/components/admin/help-tip";
import { useIsBelowLg, useIsBelowSm } from "@/hooks/use-below-lg";
import { cn } from "@/lib/utils";

/**
 * The console toolbar field: a labelled control in the form-field idiom -
 * the label on its own line above the box, the box carrying only the value.
 * Every filter control wears the SAME box so a panel of them lines up.
 */
const fieldBox =
  "flex h-11 w-full min-w-0 items-center rounded-none border bg-adm-card text-sm text-adm-ink transition-colors focus-within:border-console";

const fieldLabel = "text-xs font-medium text-adm-ink sm:text-sm";

/** The display label of `value` in an options list (for filter chips). */
export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Dropdown filter: label on top, the value text alone in the box. */
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
   * whose effect a reader cannot guess from the option names.
   */
  hint?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0 space-y-1.5 sm:space-y-2", className)}>
      <label htmlFor={id} className={cn(fieldLabel, "flex items-center gap-1")}>
        <span className="min-w-0 truncate">{label}</span>
        {hint ? (
          <HelpTip label={`What does the ${label} filter do?`} text={hint} />
        ) : null}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          unstyled
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn(
            fieldBox,
            active ? "border-console/60" : "border-adm-line",
            "cursor-pointer justify-between gap-1.5 pr-2.5 pl-3 font-normal [&_svg]:size-4 [&_svg]:text-adm-faint",
          )}
        >
          <span className="min-w-0 truncate text-left">
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Native date input in the toolbar box. Date inputs ignore `placeholder`
 * and mobile browsers render an empty one as a blank box, so while empty and
 * unfocused the native text is hidden under our own placeholder.
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
  const id = useId();
  return (
    <div className={cn("min-w-0 space-y-1.5 sm:space-y-2", className)}>
      <label htmlFor={id} className={cn(fieldLabel, "flex items-center gap-1")}>
        <span className="min-w-0 truncate">{label}</span>
      </label>
      <div
        className={cn(
          fieldBox,
          value ? "border-console/60" : "border-adm-line",
          "px-3",
        )}
      >
        <span className="relative h-full w-full min-w-0">
          <input
            id={id}
            type="date"
            value={value}
            min={min || undefined}
            max={max || undefined}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className={cn(
              "peer h-full w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-2 text-sm font-normal outline-none",
              // The picker glyph is laid out INSIDE the input as an
              // unshrinkable item; taken out of flow it cannot be pushed past
              // the border, and stretched over the field a tap anywhere opens
              // the picker.
              "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
              value ? "text-adm-ink" : "text-transparent focus:text-adm-ink",
            )}
          />
          {!value && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 left-0 flex items-center truncate text-sm text-adm-faint peer-focus:hidden"
            >
              {placeholder}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * A From/To window as ONE control, so the two bounds always read as a pair:
 * it claims two cells of the filter grid wherever the grid has two to give
 * and sits the fields side by side inside.
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
  fromLabel?: string;
  toLabel?: string;
  fieldClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:col-span-2",
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
 * One removable "active filter" chip. The screen decides when to render it
 * (only when that filter is set) and what label to show, e.g.
 * `<FilterChip onRemove={() => setFilter("status", "all")}>Status: Open</FilterChip>`.
 */
export function FilterChip({
  icon: Icon,
  children,
  onRemove,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 border border-console/30 bg-console/15 py-1 pl-2 pr-1.5 text-xs font-medium text-adm-ink sm:py-1.5 sm:pl-3 sm:pr-2">
      {Icon ? <Icon strokeWidth={1.5} className="h-3 w-3" aria-hidden="true" /> : null}
      <span className="max-w-30 truncate sm:max-w-50">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="ml-0.5 flex h-4 w-4 cursor-pointer items-center justify-center text-adm-ink/70 hover:text-adm-ink sm:ml-1"
      >
        <X strokeWidth={1.5} className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/**
 * The console list toolbar, the same toolbar on every register:
 *
 *   [count of records .......................... page actions (+ Add, Export)]
 *   [search (takes the width) ... ] [inline filter] [Filters (n)] [Clear all]
 *   [Active: chip chip chip]
 *
 * - The search box takes the available width; the Filters button is
 *   icon-only on phones and gains its label from `sm` up.
 * - Filter fields (`children`) open as an inline panel on `lg+` and as a
 *   bottom drawer below `lg`. A single `inlineFilter` sits beside the search
 *   from `sm` up and collapses into the drawer on phones.
 * - "Clear all" shows from `lg` up; below that it lives inside the drawer.
 * - Actions collapse to icons on phones: give each button
 *   `<Icon className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Label</span>`.
 */
export function ConsoleFilterBar({
  search = "",
  onSearch,
  searchPlaceholder = "Search…",
  hideSearch = false,
  activeCount = 0,
  onClear,
  action,
  totalCount,
  noun = "records",
  inlineFilter,
  chips,
  panelClassName = "sm:grid-cols-2 lg:grid-cols-4",
  className,
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  /** Non-search filters currently applied - drives the badge and clear-all. */
  activeCount?: number;
  onClear?: () => void;
  /** The page's actions ("+ Add"), on the right of the count row. */
  action?: ReactNode;
  /** Total matching records, printed as "{n} total {noun}" in the count row. */
  totalCount?: number;
  noun?: string;
  /** A single filter shown beside the search (sm+); exclusive with children. */
  inlineFilter?: ReactNode;
  /** `FilterChip`s for the filters currently applied. */
  chips?: ReactNode;
  /** Grid layout for the desktop inline filter panel. */
  panelClassName?: string;
  className?: string;
  /** The filter fields (ConsoleLabeledSelect, ConsoleDateField, ...). */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isBelowLg = useIsBelowLg();
  const isBelowSm = useIsBelowSm();
  const panelId = useId();

  const fields = Children.toArray(children);
  const hasFields = fields.length > 0;
  const hasChips = Children.toArray(chips).length > 0;
  const hasApplied = activeCount > 0;

  // Fields use the drawer below lg; a single inline filter only below sm.
  const drawerContent = hasFields ? children : inlineFilter;
  const drawerOpen =
    open && ((hasFields && isBelowLg) || (!hasFields && !!inlineFilter && isBelowSm));

  const searchField = hideSearch ? null : (
    <div className="relative flex-1">
      <Search
        strokeWidth={1.5}
        aria-hidden="true"
        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-adm-muted"
      />
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch?.(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="h-10 w-full min-w-0 rounded-none border border-adm-line bg-adm-card pr-10 pl-10 text-sm text-adm-ink shadow-none outline-none transition-colors placeholder:text-adm-faint focus:border-console focus-visible:ring-0 sm:h-11 [&::-webkit-search-cancel-button]:hidden"
      />
      {search ? (
        <button
          type="button"
          onClick={() => onSearch?.("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center text-adm-muted hover:text-adm-ink"
        >
          <X strokeWidth={1.5} className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );

  const clearAll =
    hasApplied && onClear ? (
      <AdminButton
        variant="outline"
        onClick={onClear}
        className="hidden h-10 shrink-0 text-console-red hover:bg-console-red/10 hover:text-console-red sm:h-11 lg:flex"
      >
        Clear all
      </AdminButton>
    ) : null;

  return (
    <div className={cn("mb-6 space-y-3 sm:space-y-4", className)}>
      {totalCount !== undefined || action ? (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-adm-muted sm:text-sm">
            {totalCount !== undefined
              ? `${totalCount.toLocaleString()} total ${noun}`
              : null}
          </div>
          {action ? (
            <div className="flex items-center gap-1.5 sm:gap-2">{action}</div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex gap-2">
          {searchField}

          {inlineFilter && !hasFields ? (
            <div className="hidden w-44 shrink-0 sm:block lg:w-52">
              {inlineFilter}
            </div>
          ) : null}

          {hasFields || inlineFilter ? (
            <AdminButton
              variant={hasApplied ? "primary" : "outline"}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={panelId}
              className={cn(
                "relative h-10 shrink-0 gap-2 px-3 sm:h-11",
                inlineFilter && !hasFields && "sm:hidden",
              )}
            >
              <SlidersHorizontal
                strokeWidth={1.5}
                className="h-4 w-4"
                aria-hidden="true"
              />
              <span
                className={cn(
                  "text-sm",
                  inlineFilter && !hasFields ? "hidden" : "hidden sm:inline",
                )}
              >
                Filters
              </span>
              {activeCount > 0 ? (
                <span
                  className={cn(
                    "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold",
                    hasApplied
                      ? "bg-white/20 text-white"
                      : "bg-adm-sunken text-adm-ink",
                  )}
                >
                  {activeCount}
                </span>
              ) : null}
            </AdminButton>
          ) : null}

          {clearAll}
        </div>

        {hasFields && open && !isBelowLg ? (
          <div
            id={panelId}
            className="border border-adm-line bg-adm-sunken p-3"
          >
            <div className={cn("grid grid-cols-1 gap-3", panelClassName)}>
              {children}
            </div>
          </div>
        ) : null}

        {drawerContent ? (
          <Drawer open={drawerOpen} onOpenChange={setOpen}>
            <DrawerContent className="max-h-[85vh] before:bg-adm-card">
              <DrawerHeader>
                <DrawerTitle className="text-adm-ink">Filters</DrawerTitle>
              </DrawerHeader>
              <div className="space-y-3 overflow-y-auto px-4 pb-6">
                {hasFields ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {children}
                  </div>
                ) : (
                  drawerContent
                )}
                {hasApplied && onClear ? (
                  <AdminButton
                    variant="outline"
                    onClick={onClear}
                    className="h-10 w-full text-console-red hover:bg-console-red/10 hover:text-console-red"
                  >
                    Clear all filters
                  </AdminButton>
                ) : null}
              </div>
            </DrawerContent>
          </Drawer>
        ) : null}
      </div>

      {hasChips ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-adm-muted sm:text-sm">
            Active:
          </span>
          {chips}
        </div>
      ) : null}
    </div>
  );
}
