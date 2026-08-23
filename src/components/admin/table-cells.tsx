import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The console's table-cell vocabulary.
 *
 * The rule the whole file exists to enforce: A COLUMN MUST HAVE AN OPINION
 * ABOUT ITS WIDTH. Left to itself a table sizes each column to its widest
 * cell, so one long description drags the table past the viewport and every
 * reader pays for it with a horizontal scrollbar - or, worse, the column is
 * pinched narrow instead and the text wraps to five lines, leaving a row four
 * times taller than its neighbours.
 *
 * So each cell wrapper here carries a min AND a max width. The minimum means
 * short values ("Tamale", "GH0.00", a date) are never squeezed; the maximum
 * means long ones truncate to one line with the full text on hover, and the
 * table's overall width stays bounded no matter what is in the data.
 *
 * And descriptions do NOT get a column of their own. A free-text field is
 * unbounded by nature; given its own column it will always be the one that
 * breaks the table. It belongs on a second line UNDER the thing it describes,
 * where it is subordinate in the reading order as well as the layout.
 */

/**
 * Width presets. Named for the KIND of content rather than a size, so a
 * column's declaration says what it holds and the widths stay consistent
 * across registers.
 */
// BOTH bounds are table-view only (`@2xl/table:` - ConsoleDataTable's own
// container query, the same one that swaps the phone cards for the real
// table). The minimums stop a table column being starved by a greedy
// neighbour, which is a table problem - in the stacked phone card there are
// no neighbours to compete with, and a rigid floor there just pushes the
// card off the screen. The maximums hold a column's width, and a card row
// has no column to hold: the card itself bounds the line, and the value must
// be free to spend the whole row - first the space between it and its label,
// then, once it wraps under the label, the card's full width. Any cap left
// active in the card view re-creates the squeezed-value bug: the value wraps
// inside a narrow strip while empty space sits beside the label.
const CELL_WIDTHS = {
  /** Reference numbers, short codes, dates - never wraps, never truncates. */
  code: "@2xl/table:min-w-[6.5rem]",
  /** A short label: status, role, method, a warehouse name. */
  label: "@2xl/table:max-w-[20rem] @2xl/table:min-w-[6rem]",
  /** A name with an optional description beneath - the identity column. */
  identity: "@2xl/table:max-w-[30rem] @2xl/table:min-w-[10rem]",
  /** Free text that could be any length: notes, reasons, descriptions. */
  prose: "@2xl/table:max-w-[28rem] @2xl/table:min-w-[8rem]",
  /** Roomier identity for tables with few columns. */
  wide: "@2xl/table:max-w-[38rem] @2xl/table:min-w-[12rem]",
} as const;

/**
 * How much of the cell the TITLE line may use before it clips.
 *
 * Deliberately less than the description beneath it. Clipping both at exactly
 * the same x turns the pair into two matched bars of text - they read as
 * equals, and the eye has nothing to grab. Letting the title give up a little
 * width first restores the hierarchy: the name is the shorter, heavier line
 * and its description runs on beneath it.
 *
 * Table view only, like every clamp in this file. In the phone card the cell
 * sits inside a shrink-to-fit flex item, and a percentage max-width there
 * resolves against the item's own content-derived width - it shaves even a
 * two-word value by 8% and wraps its last word while half the row stands
 * empty beside the label.
 */
const TITLE_CLAMP = "@2xl/table:max-w-[92%]";

/**
 * The clamps used INSIDE the table's one stretch column (the 40% share).
 *
 * A fixed cap is wrong here and a share is right, which is worth being precise
 * about because the two look interchangeable. A `<table>` lays each column out
 * to its widest cell, so capping the cell at, say, 28rem does not bound the
 * column - the column is still sized by the content, and the clamped text then
 * ends well short of the column's right edge. The reader gets an ellipsis with
 * empty space after it: the column was given the room and the text was not
 * allowed to use it. Clamping to a PERCENTAGE of a column that is itself
 * pinned to 40% inverts that - the text expands to fill what it was given and
 * stops just shy of the edge, and the table stays bounded.
 *
 * 90% normally; 85% when an avatar sits beside the text and has already taken
 * a fixed bite out of the line.
 */
const STRETCH_CLAMP = "@2xl/table:max-w-[90%]";
const STRETCH_CLAMP_WITH_AVATAR = "@2xl/table:max-w-[85%]";

/** The title clamp for a cell, given where it sits. */
const titleClamp = (stretch?: boolean, avatar?: boolean): string =>
  stretch
    ? avatar
      ? STRETCH_CLAMP_WITH_AVATAR
      : STRETCH_CLAMP
    : TITLE_CLAMP;

export type CellWidth = keyof typeof CELL_WIDTHS;

/**
 * What a truncated cell says on hover.
 *
 * Two different answers, because the reader needs two different things.
 *
 * When the row HAS a detail page, dumping the full value into a tooltip is the
 * wrong help: it hands back one field of a record whose other twenty fields
 * are one click away, and it teaches the reader that hovering is how this
 * table is read. So a linked cell says what to do instead.
 *
 * When the row has NO detail page the tooltip is the only place the full value
 * exists, so it shows the value. Removing it there would genuinely lose
 * information.
 *
 * `href` is the signal for which case applies, so the two can never drift
 * apart: a cell is linked exactly when there is somewhere to go.
 */
const CLICK_THROUGH = "Click to view the full details";

/**
 * The identity cell: a truncating title, with an optional description or
 * secondary fact on a quieter second line.
 *
 * Clamped text is never lost - see CLICK_THROUGH above for where it goes.
 */
export function TitleCell({
  avatar = false,
  className,
  href,
  meta,
  stretch = false,
  title,
  width = "identity",
}: {
  /** An avatar sits beside this text, so it clamps at 85% instead of 90%. */
  avatar?: boolean;
  className?: string;
  /** Makes the title a link without swallowing the row's own click. */
  href?: string;
  /** The quieter second line: a description, a community, a reference. */
  meta?: null | string;
  /**
   * This cell is in the table's stretch column. Drops the fixed width preset
   * for a share of the column, which is what lets long values use the room the
   * 40% column was given instead of stopping short of its edge.
   */
  stretch?: boolean;
  title: string;
  width?: CellWidth;
}) {
  // Truncation is a TABLE behaviour: a column must hold its width. In the
  // card view (below @2xl of the table's own container) there is no column
  // to hold and no hover to reveal the rest on touch, so the text wraps in
  // full instead - a phone user with no detail page must never be left
  // guessing what an ellipsis hides.
  const clamp = titleClamp(stretch, avatar);
  const titleNode = href ? (
    <Link
      className={cn(
        clamp,
        "block font-medium text-adm-ink [overflow-wrap:anywhere] hover:underline @2xl/table:truncate",
      )}
      href={href}
      onClick={(e) => e.stopPropagation()}
      title={CLICK_THROUGH}
    >
      {title}
    </Link>
  ) : (
    <span
      className={cn(
        clamp,
        "block font-medium text-adm-ink [overflow-wrap:anywhere] @2xl/table:truncate",
      )}
      title={title}
    >
      {title}
    </span>
  );

  return (
    <div
      className={cn(
        // In a stretch column the td already carries the 40% + max-w-0, so the
        // wrapper must only stop being a floor - a fixed preset here would
        // fight the share it sits inside.
        stretch ? "w-full min-w-0" : CELL_WIDTHS[width],
        "text-left",
        className,
      )}
    >
      {titleNode}
      {meta ? (
        <span
          className={cn(
            "block text-[11px] text-adm-faint [overflow-wrap:anywhere] @2xl/table:truncate",
            // A little more than the title, preserving the hierarchy above.
            stretch && "@2xl/table:max-w-[96%]",
          )}
          title={href ? CLICK_THROUGH : meta}
        >
          {meta}
        </span>
      ) : null}
    </div>
  );
}

/**
 * One line of text that truncates rather than wrapping. Use for any column
 * whose content has no natural length limit.
 */
export function TextCell({
  className,
  fallback = "-",
  linked = false,
  mono = false,
  stretch = false,
  value,
  width = "prose",
}: {
  className?: string;
  /** Shown when there is nothing, so the column never looks broken. */
  fallback?: string;
  /**
   * True when this row opens a detail page. The hover then points there
   * instead of repeating the value - see CLICK_THROUGH.
   */
  linked?: boolean;
  mono?: boolean;
  /** This cell is in the table's stretch column - see TitleCell.stretch. */
  stretch?: boolean;
  value: null | string | undefined;
  width?: CellWidth;
}) {
  if (!value) {
    return <span className="text-adm-faint">{fallback}</span>;
  }
  return (
    <span
      className={cn(
        stretch ? cn("w-full min-w-0", STRETCH_CLAMP) : CELL_WIDTHS[width],
        // Truncate only where there is a column to hold (the table view);
        // the card view wraps in full - see TitleCell.
        "block text-left [overflow-wrap:anywhere] @2xl/table:truncate",
        mono && "font-adminmono tabular-nums",
        className,
      )}
      title={linked ? CLICK_THROUGH : value}
    >
      {value}
    </span>
  );
}

/**
 * A cell that must never wrap or truncate: reference numbers, dates, amounts.
 * Short and fixed by nature, so it simply takes the room it needs.
 */
export function CodeCell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        CELL_WIDTHS.code,
        "block whitespace-nowrap text-left",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Right-aligned figures, so decimal points line up down the column. */
export function AmountCell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-adminmono block whitespace-nowrap text-left tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
