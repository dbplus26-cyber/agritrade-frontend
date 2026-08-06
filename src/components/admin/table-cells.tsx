import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The console's table-cell vocabulary, ported from the dms-frontend column
 * discipline.
 *
 * The rule the whole file exists to enforce: A COLUMN MUST HAVE AN OPINION
 * ABOUT ITS WIDTH. Left to itself a table sizes each column to its widest
 * cell, so one long description drags the table past the viewport and every
 * reader pays for it with a horizontal scrollbar - or, worse, the column is
 * pinched narrow instead and the text wraps to five lines, leaving a row four
 * times taller than its neighbours. The transfers register had exactly that
 * second failure on its route column.
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
// The MINIMUMS are md-and-up only. They exist to stop a table column being
// starved by a greedy neighbour, which is a table problem - below md the same
// cells render inside a stacked phone card where there are no neighbours to
// compete with, and a rigid floor there just pushes the card off the screen.
// The MAXIMUMS apply at every width: clamping long text is wanted everywhere.
const CELL_WIDTHS = {
  /** Reference numbers, short codes, dates - never wraps, never truncates. */
  code: "md:min-w-[6.5rem]",
  /** A short label: status, role, method, a warehouse name. */
  label: "max-w-[20rem] md:min-w-[6rem]",
  /** A name with an optional description beneath - the identity column. */
  identity: "max-w-[30rem] md:min-w-[10rem]",
  /** Free text that could be any length: notes, reasons, descriptions. */
  prose: "max-w-[28rem] md:min-w-[8rem]",
  /** Roomier identity for tables with few columns. */
  wide: "max-w-[38rem] md:min-w-[12rem]",
} as const;

/**
 * How much of the cell the TITLE line may use before it clips.
 *
 * Deliberately less than the description beneath it. Clipping both at exactly
 * the same x turns the pair into two matched bars of text - they read as
 * equals, and the eye has nothing to grab. Letting the title give up a little
 * width first restores the hierarchy: the name is the shorter, heavier line
 * and its description runs on beneath it.
 */
const TITLE_CLAMP = "max-w-[92%]";

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
const STRETCH_CLAMP = "max-w-[90%]";
const STRETCH_CLAMP_WITH_AVATAR = "max-w-[85%]";

/** The title clamp for a cell, given where it sits. */
const titleClamp = (stretch?: boolean, avatar?: boolean): string =>
  stretch
    ? avatar
      ? STRETCH_CLAMP_WITH_AVATAR
      : STRETCH_CLAMP
    : TITLE_CLAMP;

export type CellWidth = keyof typeof CELL_WIDTHS;

/**
 * The identity cell: a truncating title, with an optional description or
 * secondary fact on a quieter second line.
 *
 * `title` on both lines gives the untruncated text on hover, so nothing is
 * actually lost by clamping - it is one hover away rather than one horizontal
 * scroll away.
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
  const clamp = titleClamp(stretch, avatar);
  const titleNode = href ? (
    <Link
      className={cn(clamp, "block truncate font-medium text-adm-ink hover:underline")}
      href={href}
      onClick={(e) => e.stopPropagation()}
      title={title}
    >
      {title}
    </Link>
  ) : (
    <span
      className={cn(clamp, "block truncate font-medium text-adm-ink")}
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
            "block truncate text-[11.5px] text-adm-faint",
            // A little more than the title, preserving the hierarchy above.
            stretch && "max-w-[96%]",
          )}
          title={meta}
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
  mono = false,
  stretch = false,
  value,
  width = "prose",
}: {
  className?: string;
  /** Shown when there is nothing, so the column never looks broken. */
  fallback?: string;
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
        "block truncate text-left",
        mono && "font-adminmono tabular-nums",
        className,
      )}
      title={value}
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
