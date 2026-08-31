import { Skeleton } from "@/components/ui/skeleton";
import { AdminCard } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * The console's loading shapes.
 *
 * One generic table skeleton standing in for every screen makes a detail
 * page, a dashboard and a printed statement all flash a grid of table rows
 * that then vanishes - the layout jumps on arrival and the shimmer says
 * nothing about what is coming. Each skeleton here mirrors ONE real layout in
 * this console, so what shows while waiting is the shape of what lands.
 * Screens that genuinely share a layout share a skeleton; screens that do
 * not, must not.
 *
 * All of them are `aria-hidden`: a screen reader gets the region's `aria-busy`
 * from the screen, not a tree of meaningless boxes.
 */

/** Pseudo-random but stable widths, so rows look like data, not a grid. */
const width = (seed: number, base = 55, step = 15, buckets = 3): string =>
  `${String(base + (seed % buckets) * step)}%`;

/* ────────────────────────────────────────────────────────────────────
   Register / list
   ──────────────────────────────────────────────────────────────────── */

/**
 * The register table as `ConsoleDataTable` actually renders it: summary cards
 * while the container is narrow, the real header + rows once it is wide, and
 * the pager under both. Lives inside an `AdminCard`, exactly like the table it
 * stands in for, so nothing shifts.
 *
 * The proportions are the table's own, not a grid of equal bars. One column
 * carries the row's identity and takes 40% of the width with two lines in it;
 * the rest are narrow and one of them is a right-aligned figure. A skeleton of
 * five equal columns promises a layout the data then contradicts, which is the
 * jump these exist to prevent.
 */
export function ConsoleTableSkeleton({
  columns = 5,
  rows = 8,
  bare = false,
  className,
}: {
  columns?: number;
  rows?: number;
  /** Drop the card - for a table that already sits inside one. */
  bare?: boolean;
  className?: string;
}) {
  const Frame = bare ? BareFrame : AdminCard;
  return (
    <Frame className={cn(!bare && "overflow-hidden", className)}>
      {/* The same @container/table switch the real table uses, so the
          skeleton and the data agree about which view is showing. */}
      <div aria-hidden="true" className="@container/table">
        {/* The card view: a chip and a figure on the opening line, the row's
            identity under it, then the quiet meta line. The same three-part
            shape the real card has, so nothing re-flows when it lands. */}
        <div className="flex flex-col gap-2 py-2 @2xl/table:hidden">
          {Array.from({ length: Math.min(rows, 5) }, (_, row) => (
            <div
              key={row}
              className="rounded-none border border-adm-line bg-adm-card px-3.5 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-[18px] w-16 rounded-[2px]" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton
                className="mt-2 h-3.5"
                style={{ width: width(row, 45, 15) }}
              />
              <Skeleton
                className="mt-1.5 h-2.5"
                style={{ width: width(row + 1, 60, 12) }}
              />
            </div>
          ))}
        </div>

        <div className="hidden @2xl/table:block">
          <div className="flex h-[38px] items-center gap-3 border-b border-adm-line bg-adm-sunken px-3">
            {Array.from({ length: columns }, (_, col) => (
              <Skeleton
                key={col}
                className={cn("h-2.5", col === 0 ? "w-2/5 flex-none" : "flex-1")}
              />
            ))}
          </div>
          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className="flex min-h-[46px] items-center gap-3 border-b border-adm-hairline px-3 py-2.5"
            >
              {/* The identity column: 40% of the table, and two lines - a
                  title over its quiet second line, which is what TitleCell
                  renders on nearly every register. */}
              <div className="w-2/5 flex-none">
                <Skeleton className="h-3" style={{ width: width(row, 55) }} />
                <Skeleton
                  className="mt-1.5 h-2.5"
                  style={{ width: width(row + 2, 35, 10) }}
                />
              </div>
              {Array.from({ length: Math.max(columns - 1, 1) }, (_, col) => (
                <div
                  key={col}
                  className={cn(
                    "flex-1",
                    // The last column is a figure, and figures sit right.
                    col === columns - 2 && "flex justify-end",
                  )}
                >
                  <Skeleton
                    className="h-3"
                    style={{ width: width(row + col, 45, 20) }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* The pager: the count and rows-per-page on the left, the page
            buttons on the right, at the height the real bar occupies. */}
        <div className="flex items-center justify-between gap-4 border-t border-adm-line bg-adm-sunken/60 px-4 py-2.5">
          <div className="flex items-center gap-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-7" />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** `AdminCard`'s signature without the card, for the `bare` variant above. */
function BareFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

/** Page title + one-line sub, the block every console screen opens with. */
export function PageHeaderSkeleton({
  action = false,
}: {
  /** Screens with a control beside the heading (the dashboard's date range). */
  action?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
    >
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-1 h-5 w-72 max-w-full" />
      </div>
      {action ? <Skeleton className="h-[34px] w-32" /> : null}
    </div>
  );
}

/**
 * The list toolbar while a register boots: the count row with the page
 * action, then the search box with the Filters toggle beside it, at the
 * sizes the real ConsoleFilterBar uses so nothing shifts when it mounts.
 * The filter panel itself is closed until toggled, so it has no placeholder.
 */
export function FilterBarSkeleton({ filters = 2 }: { filters?: number }) {
  return (
    <div aria-hidden="true" className="mb-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-[34px] w-9 sm:w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 sm:h-11" />
        {filters > 0 ? (
          <Skeleton className="h-10 w-10 sm:h-11 sm:w-[104px]" />
        ) : null}
      </div>
    </div>
  );
}

/**
 * A whole register route while its client screen boots: heading, toolbar and
 * table, in the order and at the sizes the real screen uses. This is the
 * route-level `Suspense` fallback for every `/admin/<register>` page.
 */
export function RegisterSkeleton({
  columns = 5,
  rows = 8,
  filters = 2,
}: {
  columns?: number;
  rows?: number;
  filters?: number;
}) {
  return (
    <div>
      <PageHeaderSkeleton />
      <FilterBarSkeleton filters={filters} />
      <ConsoleTableSkeleton columns={columns} rows={rows} />
    </div>
  );
}

/**
 * The inbox card grid - approvals and reviews list records as bordered cards
 * (headline, body lines, a meta strip and a decision row), not table rows,
 * so they get the card shape rather than a ruled grid.
 */
export function CardGridSkeleton({
  cards = 6,
  columns = 3,
}: {
  cards?: number;
  /** Widest column count. Grids inside a narrow measure (the payment-policy
   * screen is capped at 680px) stop at 2 - `xl:` is a VIEWPORT query, so a
   * third column on a 1400px screen would still land inside that 680px. */
  columns?: 2 | 3;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid gap-2.5 sm:grid-cols-2",
        columns === 3 && "xl:grid-cols-3",
      )}
    >
      {Array.from({ length: cards }, (_, i) => (
        <AdminCard key={i} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3" style={{ width: width(i, 60) }} />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
          <div className="mt-3 flex flex-col gap-1.5 border-t border-adm-hairline pt-2">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-4/5" />
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

/**
 * The register grids that are NOT tables: plots and shipments list one record
 * per card in a 3-up grid - a reference line, the record's headline, a detail
 * line and a footer strip. Plots lead with a photo, so `media` reserves the
 * same 130px band the real cover image fills; without it the card would grow
 * by that band the moment the data landed.
 */
export function RecordCardGridSkeleton({
  cards = 6,
  media = false,
}: {
  cards?: number;
  /** Reserve the cover-photo band (the plot register). */
  media?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: cards }, (_, i) => (
        <AdminCard key={i} className="overflow-hidden">
          {media ? <Skeleton className="h-[130px] w-full rounded-none" /> : null}
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4" style={{ width: width(i, 60) }} />
            <Skeleton className="mt-2 h-2.5" style={{ width: width(i + 1, 45) }} />
            <div className="mt-2.5 flex items-center justify-between gap-2.5">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Stat tiles
   ──────────────────────────────────────────────────────────────────── */

/**
 * The strip of figure tiles above a register or dashboard section: an
 * uppercase label over a large figure, in a card padded the way a tile is.
 *
 * The share bar is off by default because most tiles do not have one - only
 * the stock register's per-commodity strip draws it, and reserving 3px on
 * every other screen means every tile settles by that much when the data
 * lands.
 */
export function StatTilesSkeleton({
  tiles = 4,
  className,
  bar = false,
}: {
  tiles?: number;
  className?: string;
  /** Tiles that carry a share bar under the figure (the stock strip). */
  bar?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "mb-4 grid grid-cols-2 gap-2 @lg/main:grid-cols-3 @3xl/main:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: tiles }, (_, i) => (
        <AdminCard key={i} className="px-4 py-3">
          <Skeleton className="h-2.5 w-20" />
          {/* The figure is 19px type, so the bar standing in for it is the
              height of the line it fills, not of a body line. */}
          <Skeleton className="mt-1 h-5" style={{ width: width(i, 45, 15) }} />
          {bar ? <Skeleton className="mt-1.5 h-[3px] w-full" /> : null}
        </AdminCard>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Detail
   ──────────────────────────────────────────────────────────────────── */

/** One card of label-over-value facts, as `DetailGrid` lays them out. */
function FactGridSkeleton({ facts = 6 }: { facts?: number }) {
  return (
    // RecordFacts pairs on its OWN width, not the window's: inside a detail
    // card beside a 340px rail a viewport `sm:` splits into two columns while
    // the card is still one, and the facts re-flow the moment they arrive.
    <div className="@container">
      <div className="grid grid-cols-1 gap-x-8 @lg:grid-cols-2">
        {Array.from({ length: facts }, (_, i) => (
          <div key={i} className="border-b border-adm-hairline py-2">
            {/* A 10.5px uppercase label over a 12px value, the shape every
                fact on a record page has. */}
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-1 h-3" style={{ width: width(i, 45) }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A cover image over a strip of thumbs - the plot record's photo card. */
function MediaSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-video w-full" />
      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-28" />
        ))}
      </div>
    </div>
  );
}

/**
 * The two-column record page every detail screen uses: back link, heading,
 * fact cards in the main column and a summary/actions rail on the right -
 * the rail first below `xl`, exactly as `DetailShell` stacks it.
 */
export function DetailSkeleton({
  facts = 6,
  /** Detail pages that carry a related-records table under the facts. */
  table = false,
  main = "facts",
  cards = 1,
}: {
  facts?: number;
  table?: boolean;
  /** What fills the main column - a fact grid, running ledger lines, or the
   * photo/document block a plot record leads with. */
  main?: "facts" | "ledger" | "media";
  /**
   * How many cards stack in the main column. A shipment or a sale files its
   * record across several (goods, schedule, payments, shipments); standing in
   * for all of them with one card means the page grows by three card heights
   * on arrival, which is the layout jump these skeletons exist to stop.
   */
  cards?: number;
}) {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-2 h-3 w-28" />
      <PageHeaderSkeleton action />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 flex min-w-0 flex-col gap-5 xl:order-1">
          {Array.from({ length: Math.max(cards, 1) }, (_, i) => (
            <AdminCard key={i} className="px-5 py-[18px]">
              <Skeleton className="h-2.5 w-24" />
              <div className="mt-3">
                {main === "media" ? (
                  // Only the first card leads with the photo block; the ones
                  // under it (description, documents) are ruled lines.
                  i === 0 ? (
                    <MediaSkeleton />
                  ) : (
                    <LedgerSkeleton rows={4} />
                  )
                ) : main === "ledger" ? (
                  <LedgerSkeleton />
                ) : (
                  <FactGridSkeleton facts={facts} />
                )}
              </div>
            </AdminCard>
          ))}
          {table ? <ConsoleTableSkeleton columns={4} rows={4} /> : null}
        </div>

        {/* The rail is a STACK of small cards - status, then filed, then the
            lifecycle actions - not one tall one. Standing in for three with a
            single card means the page grows by two card heights on arrival,
            and the rail is the half of the screen a reader is watching while
            they wait for the status. */}
        <div className="order-1 flex min-w-0 flex-col gap-4 self-start xl:order-2">
          <AdminCard className="px-4 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2 h-[18px] w-24 rounded-[2px]" />
          </AdminCard>
          <AdminCard className="px-4 py-3">
            <Skeleton className="h-2.5 w-14" />
            <div className="mt-2 flex flex-col gap-1.5">
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2.5 w-2/3" />
            </div>
          </AdminCard>
          <AdminCard className="px-4 py-3">
            <Skeleton className="h-2.5 w-20" />
            <div className="mt-2 flex flex-col gap-2">
              <Skeleton className="h-[34px] w-full" />
              <Skeleton className="h-[34px] w-full" />
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Ledger / activity list
   ──────────────────────────────────────────────────────────────────── */

/**
 * A list of ledger lines inside a card: marker, description over its
 * reference and date, amount right. Used by the float ledger and anything
 * else that reads as running entries rather than a table.
 */
export function LedgerSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 border-b border-adm-hairline py-2.5 last:border-b-0"
        >
          <Skeleton className="mt-0.5 h-6 w-6 flex-none" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-3" style={{ width: width(i, 40) }} />
              <Skeleton className="h-3 w-20 flex-none" />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <Skeleton className="h-2.5 w-32" />
              <Skeleton className="h-2.5 w-16 flex-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Form
   ──────────────────────────────────────────────────────────────────── */

/**
 * A record form: back link, heading, a card of label + field pairs and the
 * action row.
 *
 * The measurements are the form's own - a 38px control under an 11.5px label,
 * paired at the width the real fields pair at, in a card padded the way
 * AdminCard pads a form. A skeleton with taller controls and tighter gaps
 * moves every field on the page the moment the data lands.
 *
 * `max-w` is a CHOICE the caller makes, not a default: a create page carries
 * its own measure, while an edit page sits beside a rail and fills its column.
 * A capped skeleton in front of a filling form is a jump the width of the
 * difference.
 */
export function FormSkeleton({
  fields = 6,
  className,
  rail = false,
}: {
  fields?: number;
  className?: string;
  /**
   * The record sits beside a rail (status, filed, lifecycle) and its form
   * fills the column. Without this the skeleton is a lone narrow card and the
   * page arrives as two columns - a jump the width of the rail.
   */
  rail?: boolean;
}) {
  const card = (
    <>
      <AdminCard className="@container grid grid-cols-1 gap-5 px-5 py-[18px] @min-[440px]:grid-cols-2">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i}>
            <Skeleton className="mb-1 h-2.5 w-20" />
            <Skeleton className="h-[38px] w-full" />
          </div>
        ))}
      </AdminCard>
      <div className="mt-4 flex justify-end gap-2">
        <Skeleton className="h-[38px] w-24" />
        <Skeleton className="h-[38px] w-28" />
      </div>
    </>
  );

  return (
    <div
      aria-hidden="true"
      // The measure RecordShell gives a page with no rail. Beside a rail the
      // form fills its column instead, so the cap is dropped there.
      className={cn(!rail && "max-w-[760px]", className)}
    >
      <Skeleton className="mb-2 h-3 w-28" />
      <PageHeaderSkeleton />
      {rail ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 min-w-0 xl:order-1">{card}</div>
          {/* Status, filed, lifecycle: three short cards, the rail every
              record page carries. */}
          <div className="order-1 flex min-w-0 flex-col gap-4 self-start xl:order-2">
            {[0, 1, 2].map((i) => (
              <AdminCard key={i} className="px-4 py-3">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="mt-2 h-4" style={{ width: width(i, 45, 20) }} />
              </AdminCard>
            ))}
          </div>
        </div>
      ) : (
        card
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Lot allocation board
   ──────────────────────────────────────────────────────────────────── */

/**
 * The lot rows on the allocation board: commodity over its availability and
 * price on the left, the kg input pinned to a fixed 110px column on the right.
 * The input column is the point of the screen, so it is reserved at its real
 * width rather than shimmered as another text line.
 */
export function LotRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    // aria-hidden sits on a wrapper: AdminCard forwards className/children
    // only, so passing it through would be dropped on the floor.
    <div aria-hidden="true">
      <AdminCard className="flex flex-col gap-2 px-4 py-3">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_110px] items-center gap-2 border-b border-adm-hairline pb-2 last:border-b-0 last:pb-0"
          >
            <div className="min-w-0">
              <Skeleton className="h-3.5" style={{ width: width(i, 40) }} />
              <Skeleton
                className="mt-1.5 h-2.5"
                style={{ width: width(i, 55) }}
              />
            </div>
            <Skeleton className="h-[42px] w-full" />
          </div>
        ))}
      </AdminCard>
    </div>
  );
}

/**
 * The whole allocate route while the shipment loads: back link, heading, the
 * strip of sale tabs the loader picks between, and the lot rows underneath.
 */
export function AllocateSkeleton() {
  return (
    <div aria-hidden="true" className="max-w-[760px]">
      <Skeleton className="mb-2 h-3 w-32" />
      <PageHeaderSkeleton />
      <div className="mb-4 flex gap-1.5">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[52px] w-[150px]" />
        ))}
      </div>
      <LotRowsSkeleton />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Printed document
   ──────────────────────────────────────────────────────────────────── */

/**
 * An invoice / receipt / statement, in the shape of the sheet that replaces
 * it: the A4 measure and print margins, letterhead, addressed-to block, ruled
 * line items and the totals block hanging off the right edge. The controls
 * above the sheet are real on every document page, so nothing here stands in
 * for them.
 */
export function DocumentSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-[794px] border border-adm-line bg-white px-5 py-7 sm:px-9 sm:py-10 lg:px-16 lg:py-14"
    >
      <div className="flex items-start justify-between gap-8 border-b border-adm-line pb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 flex-none" />
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-2.5 w-40" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-6">
        <div>
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-36" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </div>
      <div className="mt-7 flex items-center gap-4 border-y border-adm-line py-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: lines }, (_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b border-adm-line py-3"
        >
          {Array.from({ length: 3 }, (_, col) => (
            <div key={col} className="flex-1">
              <Skeleton className="h-3" style={{ width: width(row + col) }} />
            </div>
          ))}
        </div>
      ))}
      <div className="mt-4 ml-auto flex w-full max-w-[300px] flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
