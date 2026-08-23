"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
  useReducedMotion,
} from "motion/react";
import {
  type Cell,
  type ColumnDef,
  flexRender,
  type Row,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTablePagination,
  PAGE_SIZE_OPTIONS,
} from "@/components/ui/DataTablePagination";
import { navigationStarted } from "@/components/admin/navigation-progress";
import { HelpTip } from "@/components/admin/help-tip";
import { CompactDates } from "@/components/admin/date-cell";
import { cn } from "@/lib/utils";

/**
 * A column heading that carries its own explanation.
 *
 * Half the console's headings are a single domain word - Basis, Float,
 * Outstanding, Variance, Lot - and a word that short can only be understood by
 * somebody who already knows it. Pass the sentence it stands for and the
 * heading grows a help icon.
 *
 * The icon is withheld from the narrow-container CARD view on purpose. Down
 * there the heading is repeated once per row, so an icon on each would put ten
 * of them down a phone screen and make the list unreadable in exactly the way
 * this is meant to prevent - the explanation is still there on hover, just
 * without the affordance. `@2xl/table` is ConsoleDataTable's own container
 * query, the same one that swaps cards for the real table.
 *
 * `HelpTip` rather than `HelpWrap` because a `<th>` in a sortable table is
 * already clickable: HelpTip's handler stops the event, so reading the
 * explanation never re-sorts the table underneath it.
 */
export function columnHelp(label: string, text: string) {
  return function HelpHeader() {
    return (
      <span className="inline-flex items-center gap-1">
        {label}
        <HelpTip
          className="hidden @2xl/table:inline-flex"
          label={`What does the ${label} column show?`}
          text={text}
        />
      </span>
    );
  };
}

/** Per-column console styling carried on TanStack column meta. */
export interface ConsoleColumnMeta {
  /**
   * Which slot this column fills on the phone card. Omitted means the column
   * is a table-only detail: it is on the record and on the detail screen, and
   * a phone list is not where it earns its room.
   */
  card?: CardSlot;
  /** Applied to both th and td (alignment, mono, responsive hiding). */
  className?: string;
  /** Applied to th only. */
  headerClassName?: string;
  /**
   * Marks the table's ONE primary column. It claims 40% of the table's width
   * instead of sizing to its content, and the cell inside truncates at ~90% of
   * that share (85% when an avatar sits beside the text).
   *
   * Why a share and not a fixed cap. A `<table>` sizes each column to its
   * widest cell, so a column holding free text is always the one that decides
   * the table's width. Capping the CELL at a fixed width (max-w-[28rem]) does
   * not stop that: the column is still laid out to whatever the content wants,
   * and the clamped text then stops well short of the column's right edge -
   * the reader sees an ellipsis with dead space beside it, which is the worst
   * of both. Pinning the COLUMN to 40% and clamping the cell to 90% OF THAT
   * makes the text use the room it was given, and bounds the table at the same
   * time: no column may ever exceed 40%.
   *
   * `max-w-0` on the td is what makes the percentage authoritative. Without it
   * the cell's min-content width wins over `w-2/5` and the column grows again.
   *
   * The COLUMN carries a floor (15rem) so it can never be squeezed to nothing
   * by the columns beside it: a share is only a share of a table that fits,
   * and when the rest want more than the remaining 60% the browser has none to
   * give. Below the floor the table grows past its container and the wrapper
   * scrolls, which is the right trade on a desktop - a name clipped to five
   * letters is not.
   *
   * NEVER put a `min-w-[…]` on anything INSIDE a stretch cell, though. A
   * minimum on the content and a share on the column are contradictory
   * instructions, and CSS resolves the contradiction in the minimum's favour:
   * `min-width` beats `max-width`, so the content keeps
   * the floor's width however narrow the column gets, `truncate` then clips
   * against the FLOOR rather than the cell, and the text runs out over the
   * next column. `min-w-0` is right; a floor never is.
   *
   * Exactly one column per table. Mark the one that says WHICH row this is.
   */
  stretch?: boolean;
}

/**
 * Where a column appears on the phone card - the summary a row collapses to
 * when there is no room for a table.
 *
 * A narrow screen does not get a smaller table; it gets a DIFFERENT thing. A
 * register listing every column as a labelled pair reads as a form, one
 * screenful per row, and the reader scrolls past four rows looking for one.
 * The card answers the only question a list is asked - which row is this, and
 * what state is it in - and the detail view answers the rest.
 *
 * So a column names the slot it fills, and anything unslotted is simply absent
 * from the card. That is the point: choosing what to drop is the work.
 *
 *   badge     a state chip, top left. Usually one; a second is allowed where
 *             a row really does carry two states (a status and what it is
 *             waiting on), and they sit side by side.
 *   trailing  the figure that belongs beside them, top right - a total, a
 *             weight, a count. Usually one; where a row genuinely carries two
 *             money figures they stack there together, because the one place
 *             a reader looks for money on a card should be the only place it
 *             appears.
 *   title     which row this is. Exactly one, and it reads first.
 *   meta      the supporting facts, joined into one quiet line under the
 *             title. Two or three; past that the line stops being scannable.
 */
export type CardSlot = "badge" | "meta" | "title" | "trailing";

declare module "@tanstack/react-table" {
  // The standard TanStack meta-augmentation shape - params/emptiness required.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  interface ColumnMeta<TData, TValue> extends ConsoleColumnMeta {}
}

/** Which slot a column asked for, or nothing when it is table-only. */
const slotOf = <TData,>(cell: Cell<TData, unknown>): CardSlot | undefined =>
  cell.column.columnDef.meta?.card;

/**
 * One row of the card view: the summary, and the ways it can be acted on.
 *
 * Its own component because a hold needs state per card, and hooks cannot live
 * inside the map that renders them.
 *
 * Selection shows as HIGHLIGHT and nothing else. A checkbox drawn on every
 * card is a control the reader has to aim at on the smallest screen they own,
 * and it earns its room only while somebody is selecting - which is a fraction
 * of the time a list is open. The rows that are chosen look chosen, the bar
 * above says how many, and the box stays in the table view where there is
 * space for a column.
 */
function SummaryCard<TData>({
  actionCells,
  cells,
  headerLabel,
  href,
  index,
  onNavigate,
  reducedMotion,
  row,
  selectable,
  selectionActive,
}: {
  actionCells: Cell<TData, unknown>[];
  cells: Cell<TData, unknown>[];
  headerLabel: Map<string, React.ReactNode>;
  href: string | undefined;
  index: number;
  onNavigate: (href: string) => void;
  reducedMotion: boolean | null;
  row: Row<TData>;
  selectable: boolean;
  /** True while anything on the page is selected. */
  selectionActive: boolean;
}) {
  const selected = row.getIsSelected();
  const toggle = selectable
    ? () => {
        row.toggleSelected();
      }
    : undefined;
  const { consumedHold, holdProps } = useHoldToSelect(toggle);

  // While a selection is being built, a tap adds to it rather than leaving the
  // list - the thing every phone does once the first item is held. With
  // nothing selected the card is simply a link to the record.
  const openOnTap = href !== undefined && !(selectionActive && selectable);

  return (
    <motion.li
      // Position only: a card whose content changes size snaps to it rather
      // than stretching its text through a scale.
      layout="position"
      {...rowMotion(index, Boolean(reducedMotion), true)}
      transition={{
        layout: reducedMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 500, damping: 40 },
      }}
      data-slot-card=""
      data-state={selected ? "selected" : undefined}
      {...holdProps}
      onClick={() => {
        // The click that ends a hold is the hold's own, not a tap.
        if (consumedHold()) return;
        if (openOnTap && href) {
          navigationStarted();
          onNavigate(href);
          return;
        }
        toggle?.();
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === " " && toggle) {
          // Space is the checkbox key, and it is free here: a link answers to
          // Enter. Prevented so the page does not scroll under the selection.
          e.preventDefault();
          toggle();
          return;
        }
        if (e.key === "Enter" && href) {
          e.preventDefault();
          navigationStarted();
          onNavigate(href);
        }
      }}
      role={href ? "link" : undefined}
      tabIndex={(href ?? toggle) ? 0 : undefined}
      className={cn(
        // Squared with a 1.5px border to match AdminCard, the surface every
        // other console screen is filed on.
        // A COLUMN with a gap: the sections used to sit flush, so a title
        // carrying an avatar pressed against the badge row above it.
        "flex flex-col gap-1.5 rounded-none border border-adm-line bg-adm-card px-3.5 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        // The selected state has to carry on its own now that no box does: a
        // filled tint, a full-strength border, and a bar down the leading edge
        // that survives being read in sunlight.
        "data-[state=selected]:border-console data-[state=selected]:bg-console/[0.07] data-[state=selected]:shadow-[inset_3px_0_0_0_var(--color-console)]",
        (href ?? toggle) &&
          "cursor-pointer hover:border-adm-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-console",
        // No platform callout over a card being held.
        selectable && "select-none [-webkit-touch-callout:none]",
      )}
    >
      {summaryCard(cells, headerLabel, actionCells)}
    </motion.li>
  );
}

/**
 * A row as a card: the summary a person scans, not the row transposed.
 *
 * Shape, top to bottom: the state chip and its one figure on a line together,
 * then which row this is, then the quiet line of supporting facts. Empty slots
 * collapse - a card with no badge starts at the title, and no space is
 * reserved for something that is not there.
 *
 * A column that named no slot is absent by design; the whole card is a link to
 * the row's detail view, which is where the rest of the record lives.
 *
 * Falls back to the old labelled pairs only when a table has annotated
 * nothing, so a screen written before the slots exists still renders its data
 * rather than an empty card.
 */
function summaryCard<TData>(
  cells: Cell<TData, unknown>[],
  headerLabel: Map<string, React.ReactNode>,
  actionCells: Cell<TData, unknown>[],
) {
  const render = (cell: Cell<TData, unknown>) =>
    flexRender(cell.column.columnDef.cell, cell.getContext());
  // A slot with nothing in it is not a slot: an empty badge would hold a line
  // open, and an empty meta entry would leave a stray separator behind.
  //
  // A DISPLAY column has nothing to inspect - it carries no accessor, so
  // getValue() is undefined however much its cell renders. Judging those by
  // their value dropped the status badge from every card on the registers
  // that declare status as a display column, which is most of them.
  const filled = (cell: Cell<TData, unknown>) => {
    if (!cell.column.accessorFn) return true;
    const raw = cell.getValue();
    return raw !== null && raw !== undefined && raw !== "";
  };

  const slotted = cells.filter((c) => slotOf(c) !== undefined);
  if (slotted.length === 0) {
    return (
      <>
        {cells.filter(filled).map((cell) => (
          <CardField key={cell.id} label={headerLabel.get(cell.column.id)}>
            {render(cell)}
          </CardField>
        ))}
        {actionCells.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap justify-end gap-1.5 border-t border-adm-hairline pt-1.5">
            {actionCells.map((cell) => (
              <span key={cell.id}>{render(cell)}</span>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  const badges = slotted.filter((c) => slotOf(c) === "badge" && filled(c));
  const trailing = slotted.filter((c) => slotOf(c) === "trailing" && filled(c));
  const title = slotted.find((c) => slotOf(c) === "title");
  const meta = slotted.filter((c) => slotOf(c) === "meta" && filled(c));

  return (
    <>
      {badges.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {badges.map((cell) => (
            <span key={cell.id}>{render(cell)}</span>
          ))}
        </div>
      ) : null}
      {title ? (
        <div className="min-w-0 text-[12px] leading-[1.35] font-medium text-adm-ink">
          {render(title)}
        </div>
      ) : null}
      {meta.length > 0 ? (
        // Separated by a middle dot rather than stacked: three short facts on
        // one quiet line is one glance, and three lines is three.
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[11px] text-adm-muted">
          {meta.map((cell, index) => (
            <span key={cell.id} className="flex min-w-0 items-baseline gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-adm-faint">
                  ·
                </span>
              ) : null}
              <span className="min-w-0 truncate">{render(cell)}</span>
            </span>
          ))}
        </div>
      ) : null}
      {/* The figures and what can be done about them CLOSE the card, on one
          row, reading from the left like everything above them. Pinned to the
          top right they sat away from the name they belong to, and a card
          reads top to bottom: what this is, then what it comes to. */}
      {trailing.length > 0 || actionCells.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-end gap-x-4 gap-y-2 pt-0.5">
          {trailing.map((cell) => (
            <span className="flex min-w-0 flex-col" key={cell.id}>
              {/* Named only where there are two of them. One figure closing a
                  card is that card's amount and needs no caption; two side by
                  side are a pair of numbers with nothing saying which is the
                  balance and which the allowance. */}
              {trailing.length > 1 ? (
                <span className="text-[9px] font-bold tracking-[0.09em] text-adm-faint uppercase">
                  {headerLabel.get(cell.column.id)}
                </span>
              ) : null}
              <span className="text-[11px] font-semibold text-adm-ink">
                {render(cell)}
              </span>
            </span>
          ))}
          {actionCells.map((cell) => (
            <span key={cell.id}>{render(cell)}</span>
          ))}
        </div>
      ) : null}
    </>
  );
}

/**
 * One label/value line of the phone card.
 *
 * The pair is a WRAPPING flex row, which gives the value its two intended
 * shapes from a single rule. While the value fits beside the label it sits on
 * the same line, pushed to the right edge, and is free to spend ALL of the
 * space between the two - shrink-to-fit against the whole remainder of the
 * row, not some smaller strip. The moment it would collide with the label,
 * flex wrapping drops the whole value onto its own line UNDER the label,
 * where it starts at the left edge and wraps across the card's full width to
 * as many lines as it needs. A long value is never squeezed into a sliver
 * with dead space sitting beside the label.
 *
 * (For that to hold, nothing the cell renders may cap its own width in the
 * card view - see table-cells.tsx, whose clamps are all scoped to
 * `@2xl/table:` for exactly this reason. A percentage max-width inside a
 * shrink-to-fit flex item resolves against the item's own content-derived
 * width, which shaved values narrow and wrapped two-word cells while half
 * the row stood empty - the bug this layout replaces.)
 *
 * The one decision CSS cannot make is the text alignment: right-aligned is
 * correct while the value sits beside the label, but a stacked multi-line
 * value must read left to right like prose. Which shape the row took is only
 * knowable after layout - the value's box starts below the label's exactly
 * when it wrapped - so the component observes it and flips `text-align` to
 * match. The observation changes alignment ONLY, never a width, so it cannot
 * feed back into the wrap it is watching.
 *
 * The value span is BLOCK, not the default inline: cell content is routinely
 * a block element, and inside an inline parent its containing block resolves
 * further up the tree, letting wide content run off the side of the card.
 */
function CardField({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const [stacked, setStacked] = useState(false);

  useLayoutEffect(() => {
    const labelEl = labelRef.current;
    const valueEl = valueRef.current;
    if (!labelEl || !valueEl) return;
    // `items-start` puts both boxes at the top of their flex line, so the
    // value sits lower than the label exactly when it wrapped to its own
    // line (1px of tolerance for rounding).
    const measure = () => setStacked(valueEl.offsetTop > labelEl.offsetTop + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(valueEl);
    if (valueEl.parentElement) observer.observe(valueEl.parentElement);
    return () => observer.disconnect();
  }, []);

  if (!label) {
    return (
      <div className="border-b border-adm-hairline py-1.5 text-[12px] last:border-b-0">
        <span className="block min-w-0 [overflow-wrap:anywhere] text-adm-body">
          {children}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5 border-b border-adm-hairline py-1.5 text-[12px] last:border-b-0">
      <span
        ref={labelRef}
        className="flex-none pt-px text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase"
      >
        {label}
      </span>
      <span
        ref={valueRef}
        className={cn(
          "block min-w-0 [overflow-wrap:anywhere] text-adm-body",
          stacked ? "text-left" : "text-right",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * The console data table: TanStack Table on the shadcn Table primitives, in
 * the DB Plus skin. Screens own their search inputs and filters (pass the
 * query via `globalFilter`); the table owns sorting, selection and paging:
 *
 * - `enableSelection` injects the checkbox column; `renderBulkActions`
 *   receives the selected rows (and a clear function) and is rendered as a
 *   toolbar row while anything is selected - the home of "Delete selected".
 * - Pagination is the shared DataTablePagination footer with a rows-per-page
 *   selector, and it only appears once there are more rows than
 *   the smallest page size. Two items never get a pager.
 */
/**
 * The props that make a click-navigable row or card reachable by keyboard.
 *
 * A TanStack row that navigates on click has no keyboard path to its detail
 * page. A retrofit link inside such a row is invasive, so
 * the surface itself becomes a link: focusable, announced as one, opened with
 * Enter (role=link semantics - Space stays with buttons). The keydown only
 * fires when the row ITSELF is focused, so Enter on a button inside a row
 * still presses the button, not the row.
 */
const rowNavProps = (
  href: string | undefined,
  navigate: (href: string) => void,
) =>
  href
    ? {
        onClick: () => {
          navigationStarted();
          navigate(href);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" && e.target === e.currentTarget) {
            e.preventDefault();
            navigationStarted();
            navigate(href);
          }
        },
        role: "link" as const,
        tabIndex: 0,
      }
    : {};

/**
 * Press and hold to select, on the card view.
 *
 * A checkbox on a phone card is the wrong control twice over: it is a 16px
 * target on the only screen where targets have to be thumb-sized, and it puts
 * a second thing to aim at on a row whose whole surface is already a link. So
 * the card carries no box at all. Holding a card for half a second selects it,
 * which is what a phone user already does to select a message or a photo, and
 * once anything is selected a plain tap toggles the next one rather than
 * navigating - otherwise selecting five rows means five long presses.
 *
 * The hold is cancelled by movement: a press that turns into a scroll is a
 * scroll, and a list that selects a row every time somebody flicks past it is
 * worse than no selection at all.
 *
 * Keyboard users get the same thing on Space, the key a checkbox answers to,
 * with Enter still following the row's link. A gesture with no keyboard path
 * is a feature half the people using it cannot reach.
 */
const HOLD_MS = 500;
/** How far a finger may drift before the press counts as a scroll. */
const HOLD_SLOP_PX = 10;

function useHoldToSelect(onSelect: (() => void) | undefined) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  // Set the moment a hold fires, so the click that follows the release does
  // not also navigate. Cleared on the next press.
  const held = useRef(false);

  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  };

  useEffect(() => clear, []);

  if (!onSelect) {
    return { consumedHold: () => false, holdProps: {} };
  }

  return {
    /** True when the click being handled is the tail of a hold. */
    consumedHold: () => {
      const wasHeld = held.current;
      held.current = false;
      return wasHeld;
    },
    holdProps: {
      // A held card must not also raise the platform's own long-press menu
      // (the iOS link callout, the Android context menu) over the top of it.
      onContextMenu: (e: React.MouseEvent) => {
        if (held.current) e.preventDefault();
      },
      onPointerCancel: clear,
      onPointerDown: (e: React.PointerEvent) => {
        // Mouse users have the checkbox column in the table view; a hold here
        // would only be a way to select something by accident.
        if (e.pointerType === "mouse") return;
        held.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        timer.current = setTimeout(() => {
          held.current = true;
          onSelect();
        }, HOLD_MS);
      },
      onPointerMove: (e: React.PointerEvent) => {
        const from = origin.current;
        if (!from) return;
        if (
          Math.abs(e.clientX - from.x) > HOLD_SLOP_PX ||
          Math.abs(e.clientY - from.y) > HOLD_SLOP_PX
        ) {
          clear();
        }
      },
      onPointerUp: clear,
    },
  };
}

/**
 * How a row or card arrives and leaves.
 *
 * A row that appears after the table is on screen fades in with a small lift,
 * each one a beat after the last so a set reads as arriving in order rather
 * than popping in; the stagger stops growing after ten so a long page never
 * keeps the reader waiting. A row that leaves - a decision, a delete, a
 * filter - fades out a touch faster than it came in. `lift` is off for a
 * `<tr>`: a table row cannot be transformed or height-animated reliably, so
 * it fades only. Under reduced motion every step is instant, matching the
 * global stylesheet rule that switches CSS transitions off.
 */
const STAGGER_CAP = 10;
const rowMotion = (
  index: number,
  reduced: boolean,
  lift: boolean,
): {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
} => ({
  initial: { opacity: 0, ...(lift && !reduced ? { y: 4 } : {}) },
  animate: {
    opacity: 1,
    ...(lift ? { y: 0 } : {}),
    transition: reduced
      ? { duration: 0 }
      : {
          duration: 0.18,
          ease: "easeOut",
          delay: Math.min(index, STAGGER_CAP) * 0.02,
        },
  },
  exit: {
    opacity: 0,
    transition: reduced ? { duration: 0 } : { duration: 0.15, ease: "easeIn" },
  },
});

export interface ServerPagination {
  totalCount: number;
  /** 1-based current page. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ConsoleDataTable<TData>({
  columns,
  data,
  itemNoun,
  pageSize: initialPageSize = 10,
  globalFilter = "",
  rowHref,
  rowClassName,
  emptyState,
  className,
  enableSelection = false,
  renderBulkActions,
  serverPagination,
  isFetching = false,
  isFiltered = false,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  /** Plural noun for the footer, e.g. "purchases". */
  itemNoun: string;
  pageSize?: number;
  globalFilter?: string;
  /** Row click / keyboard navigation target. */
  rowHref?: (row: TData) => string | undefined;
  /**
   * Extra classes for a TABLE ROW. Deliberately NOT applied to the mobile card:
   * every caller passes a fixed height here (`h-12`, `h-14`) because that is
   * what a `<tr>` wants, and clamping a card holding five stacked label/value
   * rows to 48px makes them overlap each other. The card owns its own vertical
   * rhythm.
   */
  rowClassName?: (row: TData) => string | undefined;
  emptyState?: React.ReactNode;
  className?: string;
  /** Adds the select-all / per-row checkboxes. */
  enableSelection?: boolean;
  /** Toolbar shown while rows are selected (bulk delete etc.). */
  renderBulkActions?: (
    selected: TData[],
    clearSelection: () => void,
  ) => React.ReactNode;
  /**
   * Server mode: searching/filtering/paging happen backend-side;
   * `data` is exactly the current page and the footer drives these callbacks.
   */
  serverPagination?: ServerPagination;
  /** True while a refetch is in flight - the current rows stay visible,
   * slightly dimmed, and snap to the new list when it lands. */
  isFetching?: boolean;
  /**
   * True when a search or filter is narrowing the list.
   *
   * It changes what an empty table MEANS, and therefore what it should look
   * like. Nothing on file at all is a register waiting to be started: it gets
   * the empty state ALONE, with no column headings standing over nothing and
   * no pager for a single absent page. Nothing matching a filter is a
   * different message entirely - the headings stay, because the columns are
   * what the reader just filtered on.
   *
   * Without it the shell draws the full table furniture around an empty body,
   * which is what makes a register with no rows still scroll sideways: the
   * header row, not the content, sets the width.
   */
  isFiltered?: boolean;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion() ?? false;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pageSize, setPageSize] = useState(initialPageSize);

  const allColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!enableSelection) return columns;
    const select: ColumnDef<TData, unknown> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows on this page"
          className="cursor-pointer border-adm-strong"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
          className="cursor-pointer border-adm-strong"
        />
      ),
      enableSorting: false,
      meta: { className: "w-9 pr-0" },
    };
    return [select, ...columns];
  }, [columns, enableSelection]);

  const manual = Boolean(serverPagination);
  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter: manual ? "" : globalFilter, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(manual ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    manualPagination: manual,
    manualFiltering: manual,
    globalFilterFn: "includesString",
    // A row's identity is its record's id where it has one, so the enter and
    // exit animations below follow the RECORD: the row that was deleted is
    // the one that fades out, and the rows under it slide up. TanStack's
    // default id is the array index, which would have had the LAST row fade
    // out on every removal while the others swapped content in place.
    getRowId: (row, index) => {
      const id = (row as { id?: unknown }).id;
      return typeof id === "string" || typeof id === "number"
        ? String(id)
        : String(index);
    },
    initialState: { pagination: { pageSize: initialPageSize } },
  });

  // Keep TanStack's page size in step with the footer's selector (client mode).
  useEffect(() => {
    if (!manual) table.setPageSize(pageSize);
  }, [pageSize, table, manual]);

  const rows = table.getRowModel().rows;
  // Column-id -> header label, for the mobile card variant (below).
  const leafHeaders = table.getHeaderGroups().at(-1)?.headers ?? [];
  const headerLabel = new Map(
    leafHeaders.map((h) => [
      h.column.id,
      h.isPlaceholder
        ? null
        : flexRender(h.column.columnDef.header, h.getContext()),
    ]),
  );
  const total = serverPagination
    ? serverPagination.totalCount
    : table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  // No pager for a page that couldn't possibly need one.
  const showPagination = total > Math.min(...PAGE_SIZE_OPTIONS);

  // A register with nothing in it and nothing filtering it shows the empty
  // state and NOTHING else - no headings over an absent body, no pager, no
  // scroll container. Withheld while fetching so the first paint of a table
  // that does have rows isn't a flash of "nothing here".
  if (!isFetching && rows.length === 0 && !isFiltered) {
    return (
      <div className={cn("@container/table min-w-0", className)}>
        {emptyState ?? (
          <div className="px-4 py-12 text-center text-[12px] text-adm-muted">
            Nothing here yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("animate-console-in @container/table min-w-0", className)}
    >
      {enableSelection && selectedRows.length > 0 && renderBulkActions ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-adm-line bg-adm-sunken px-4 py-2">
          <span className="text-[11.5px] font-semibold text-adm-body">
            {selectedRows.length} selected
          </span>
          <div className="flex items-center gap-2">
            {renderBulkActions(selectedRows, () => setRowSelection({}))}
          </div>
        </div>
      ) : null}

      {/* Narrow CONTENT (not narrow viewport): each row becomes a stacked
          label/value card, so the table never scrolls sideways and no column is
          hidden off-screen.

          Keyed to this component's OWN container width, not the viewport. A
          768px tablet has only ~512px of content once the 16rem sidebar is
          open, so a viewport `md:` would render the full table into half the
          room it was designed for - the cramped, overflowing layout this
          replaces. Measuring the container instead means the switch is right
          wherever the table is placed, and there is exactly ONE rule setting
          `display` per view (a viewport fallback alongside would race it,
          with whichever lands later in the stylesheet silently winning). */}
      <ul
        // A list, and announced as one: the card view is the phone rendering of
        // a table's rows, so "list, 12 items" is the count a screen reader user
        // needs before deciding to read on. `role="list"` is explicit because
        // the list-style reset Tailwind applies strips it in Safari.
        role="list"
        className={cn(
          // `relative` anchors a leaving card: AnimatePresence pops it out of
          // the flow so its neighbours can slide up at once, and it needs a
          // positioned ancestor to hold its place while it fades.
          "relative flex flex-col gap-2 py-2 transition-opacity duration-200 @2xl/table:hidden",
          isFetching && "pointer-events-none opacity-60",
        )}
        aria-busy={isFetching || undefined}
      >
        <CompactDates.Provider value>
        {rows.length === 0 ? (
          <li>
            {emptyState ?? (
              <div className="px-4 py-12 text-center text-[12px] text-adm-muted">
                Nothing here yet.
              </div>
            )}
          </li>
        ) : (
          // `initial={false}`: the first paint arrives whole; only cards that
          // appear AFTER mount play the entrance.
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((row, index) => {
              const href = rowHref?.(row.original);
              // The select column is a table affordance and is dropped here:
              // on a card, selecting is a press and hold, and the state shows
              // as highlight.
              const visible = row
                .getVisibleCells()
                .filter((c) => c.column.id !== "select");
              // A DATA column carries an accessor - either form TanStack accepts,
              // accessorFn or accessorKey. Checking only accessorFn mistakes an
              // accessorKey column for a row action and drops it to the card
              // foot. An ACTION column is a display column with neither.
              //
              // A column that NAMES a card slot is content by declaration,
              // accessor or not. Status is usually a display column - the
              // badge is computed in the cell, so there is nothing to accessor
              // - and reading it as a row action put it on a line of its own
              // at the foot of the card, away from the figure it belongs
              // beside, on every register that declares status that way.
              const isData = (c: (typeof visible)[number]) => {
                if (c.column.columnDef.meta?.card) return true;
                const def = c.column.columnDef as {
                  accessorFn?: unknown;
                  accessorKey?: unknown;
                };
                return Boolean(def.accessorFn ?? def.accessorKey);
              };
              // A table puts row actions wherever the column order says; a CARD
              // reads top to bottom, so they belong at the foot of it. Split
              // rather than relying on call sites to declare actions last.
              const cells = visible.filter(isData);
              const actionCells = visible.filter((c) => !isData(c));
              return (
                <SummaryCard
                  key={row.id}
                  actionCells={actionCells}
                  cells={cells}
                  headerLabel={headerLabel}
                  href={href}
                  index={index}
                  onNavigate={(h) => router.push(h)}
                  reducedMotion={reducedMotion}
                  row={row}
                  // Selecting is only offered where the table offers it at all.
                  selectable={enableSelection && row.getCanSelect()}
                  selectionActive={selectedRows.length > 0}
                />
              );
            })}
          </AnimatePresence>
        )}
        </CompactDates.Provider>
      </ul>

      {/* Wide container: the real table, horizontally scrollable only as a
          last resort on genuinely wide content. */}
      <div
        className={cn(
          "hidden overflow-x-auto transition-opacity duration-200 @2xl/table:block",
          isFetching && "pointer-events-none opacity-60",
        )}
        aria-busy={isFetching || undefined}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-adm-line bg-adm-sunken hover:bg-adm-sunken"
              >
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      // The sorted state, said rather than drawn: an arrow beside
                      // the label tells a person looking at the screen and nobody
                      // else, and a column header is exactly the thing a screen
                      // reader user needs the state of before reading the rows.
                      aria-sort={
                        dir === "asc"
                          ? "ascending"
                          : dir === "desc"
                            ? "descending"
                            : sortable
                              ? "none"
                              : undefined
                      }
                      className={cn(
                        "h-[38px] px-3 text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted",
                        meta?.className,
                        meta?.headerClassName,
                        // Last, so the share wins over any width in the meta.
                        // Header and body carry the same floor, or the two
                        // disagree about the column's width.
                        meta?.stretch && "w-2/5 min-w-[15rem]",
                      )}
                    >
                      {sortable ? (
                        // A real button, not a click handler on the cell. Sorting
                        // is an action, and an action reachable only by mouse is
                        // one a keyboard user simply does not have.
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-mx-1 inline-flex cursor-pointer select-none items-center gap-1 rounded-none px-1 py-1 font-[inherit] text-[inherit] tracking-[inherit] uppercase hover:text-adm-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-console"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {dir === "asc" ? (
                            <ArrowUp aria-hidden="true" className="h-3 w-3" />
                          ) : dir === "desc" ? (
                            <ArrowDown aria-hidden="true" className="h-3 w-3" />
                          ) : null}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={allColumns.length} className="p-0">
                  {emptyState ?? (
                    <div className="px-4 py-12 text-center text-[12px] text-adm-muted">
                      Nothing here yet.
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              // A `<tr>` fades in and out where a card also lifts and slides:
              // table rows do not animate transform or height reliably, so
              // neighbours snap into place once a leaving row has faded.
              // `motion.tr` stands in for the shadcn TableRow with the same
              // data-slot and base classes, so its styling is unchanged.
              <AnimatePresence initial={false}>
                {rows.map((row, index) => {
                  const href = rowHref?.(row.original);
                  return (
                    <motion.tr
                      key={row.id}
                      {...rowMotion(index, reducedMotion, false)}
                      data-slot="table-row"
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      {...rowNavProps(href, (h) => router.push(h))}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
                        "border-adm-hairline data-[state=selected]:bg-console/5",
                        href &&
                          "cursor-pointer transition-colors duration-150 hover:bg-adm-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-console",
                        rowClassName?.(row.original),
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            // Two lines is the ceiling for ANY cell. A row is a
                            // scan target, not a paragraph: let one cell run to
                            // four lines and every row beside it inherits the
                            // height, and the table stops being scannable. Cells
                            // that want a single line clamp themselves; this is
                            // the backstop for the ones that do not.
                            "px-3 py-2.5 text-[12px] text-adm-body [&_p]:line-clamp-2",
                            cell.column.columnDef.meta?.className,
                            // max-w-0 is not cosmetic: without it the cell's
                            // min-content width beats w-2/5 and the column grows
                            // back to whatever the longest value wants.
                            // The floor is what stops the column collapsing.
                            // `w-2/5` is a SHARE of a table that fits; when the
                            // other columns want more than the remaining 60%
                            // there is no share to be had, and `max-w-0` leaves
                            // this cell with no min-content of its own to hold
                            // it open - so the name a person is scanning for was
                            // clipped after four or five letters. A floor lets
                            // the table grow past its container instead, which
                            // the wrapper already scrolls.
                            cell.column.columnDef.meta?.stretch &&
                              "w-2/5 max-w-0 min-w-[15rem]",
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination ? (
        <DataTablePagination
          totalCount={total}
          page={serverPagination ? serverPagination.page : pageIndex + 1}
          pageSize={serverPagination ? serverPagination.pageSize : pageSize}
          selectedCount={selectedRows.length}
          itemNoun={itemNoun}
          onPageChange={(p) =>
            serverPagination
              ? serverPagination.onPageChange(p)
              : table.setPageIndex(p - 1)
          }
          onPageSizeChange={(size) =>
            serverPagination
              ? serverPagination.onPageSizeChange(size)
              : setPageSize(size)
          }
        />
      ) : total > 0 ? (
        <div className="border-t border-adm-line px-4 py-2.5 text-[11.5px] text-adm-muted">
          {total} {itemNoun}
        </div>
      ) : null}
    </div>
  );
}
