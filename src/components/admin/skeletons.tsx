import { Skeleton } from "@/components/ui/skeleton";
import { AdminCard } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * The console's loading shapes.
 *
 * One generic table skeleton used to stand in for every screen, so a detail
 * page, a dashboard and a printed statement all flashed a grid of table rows
 * that then vanished - the layout jumped on arrival and, worse, the shimmer
 * told you nothing about what was coming. Each skeleton here mirrors ONE real
 * layout in this console, so what you see while waiting is the shape of what
 * lands. Screens that genuinely share a layout share a skeleton; screens that
 * do not, must not.
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
 * The register table as `ConsoleDataTable` actually renders it: stacked
 * label/value cards while the container is narrow, the real header + rows
 * once it is wide, and the row-count footer under both. Lives inside an
 * `AdminCard`, exactly like the table it stands in for, so nothing shifts.
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
        <div className="flex flex-col gap-2 p-2 @2xl/table:hidden">
          {Array.from({ length: Math.min(rows, 5) }, (_, row) => (
            <div
              key={row}
              className="rounded-none border border-adm-line bg-adm-card px-3 py-2"
            >
              {Array.from({ length: Math.min(columns, 4) }, (_, line) => (
                <div
                  key={line}
                  className="flex items-center justify-between gap-3 border-b border-adm-hairline py-[7px] last:border-b-0"
                >
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton
                    className="h-3"
                    style={{ width: width(row + line, 28, 12) }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="hidden @2xl/table:block">
          <div className="flex h-[38px] items-center gap-3 border-b border-adm-line bg-adm-sunken px-3">
            {Array.from({ length: columns }, (_, col) => (
              <Skeleton key={col} className="h-2.5 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className="flex h-12 items-center gap-3 border-b border-adm-hairline px-3"
            >
              {Array.from({ length: columns }, (_, col) => (
                <div key={col} className="flex-1">
                  <Skeleton
                    className="h-3"
                    style={{ width: width(row + col) }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-adm-line px-4 py-2.5">
          <Skeleton className="h-3 w-24" />
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
  /** Registers carry a persistent "+ Add …" button beside the heading. */
  action?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="mb-3.5 flex flex-wrap items-end justify-between gap-3"
    >
      <div>
        <Skeleton className="h-[22px] w-44" />
        <Skeleton className="mt-1.5 h-3 w-72 max-w-full" />
      </div>
      {action ? <Skeleton className="h-8 w-32" /> : null}
    </div>
  );
}

/**
 * The filter toolbar, in the TWO BANDS the real one uses: search and the page
 * action on top, filters underneath.
 *
 * It has to mirror ConsoleFilterBar's own breakpoints or the page visibly
 * rearranges itself the moment the real toolbar mounts, which is the one thing
 * a skeleton exists to prevent. So the switches here are the same
 * `@min-[680px]/main` container queries, not the `lg:` viewport ones this used
 * to carry: the shell's sidebar eats ~225px, so `lg:` fires while the content
 * area is still narrow and the placeholder would sit in the wide arrangement
 * while the real toolbar sat in the narrow one.
 */
export function FilterBarSkeleton({ filters = 2 }: { filters?: number }) {
  return (
    <div aria-hidden="true" className="mb-3 flex flex-col gap-2">
      <div className="flex flex-col gap-2 @min-[680px]/main:flex-row @min-[680px]/main:items-center">
        <Skeleton className="h-9 w-full @min-[680px]/main:w-[30%] @min-[680px]/main:min-w-[240px] @min-[680px]/main:flex-none" />
        <Skeleton className="h-9 w-32 @min-[680px]/main:ml-auto" />
      </div>
      {/* Hidden behind the Filters toggle below 680px, exactly as the real
          filters are, so nothing appears and then vanishes on mount. */}
      <div className="hidden gap-2 @min-[680px]/main:grid @min-[680px]/main:grid-cols-[repeat(auto-fill,minmax(150px,190px))]">
        {Array.from({ length: filters }, (_, i) => (
          <Skeleton className="h-9 w-full" key={i} />
        ))}
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
      <PageHeaderSkeleton action />
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

/** The strip of figure tiles above a register or dashboard section. */
export function StatTilesSkeleton({
  tiles = 4,
  className,
}: {
  tiles?: number;
  className?: string;
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
        <AdminCard key={i} className="px-3 py-2.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-2 h-4 w-24" />
          <Skeleton className="mt-2 h-[3px] w-full" />
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
    <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
      {Array.from({ length: facts }, (_, i) => (
        <div key={i} className="border-b border-adm-hairline py-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-1.5 h-3.5" style={{ width: width(i, 45) }} />
        </div>
      ))}
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
            <AdminCard key={i} className="px-5 py-4">
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

        <div className="order-1 min-w-0 self-start xl:order-2">
          <AdminCard className="px-5 py-4">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-2 h-7 w-36" />
            <div className="mt-4 flex flex-col gap-2 border-t border-adm-hairline pt-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
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
 * A record form: back link, heading, a card of stencil-label + field pairs
 * (two columns from `sm`, like every console form card) and the action row.
 */
export function FormSkeleton({
  fields = 6,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("max-w-[560px]", className)}>
      <Skeleton className="mb-2 h-3 w-28" />
      <PageHeaderSkeleton />
      <AdminCard className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i}>
            <Skeleton className="mb-[7px] h-2.5 w-20" />
            <Skeleton className="h-[42px] w-full" />
          </div>
        ))}
      </AdminCard>
      <div className="mt-4 flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
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
 * An invoice / receipt / statement: the print toolbar, then the sheet itself
 * - letterhead, ruled line items, and the totals block that hangs off the
 * right edge. Left-aligned and 720px wide, like the real documents.
 */
export function DocumentSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div aria-hidden="true">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="max-w-[720px] border border-adm-line bg-white p-8">
        <div className="flex items-start justify-between border-b-2 border-adm-line pb-3">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-2.5 w-40" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4 border-y border-adm-line py-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-2.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: lines }, (_, row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b border-adm-line py-2"
          >
            {Array.from({ length: 4 }, (_, col) => (
              <div key={col} className="flex-1">
                <Skeleton className="h-3" style={{ width: width(row + col) }} />
              </div>
            ))}
          </div>
        ))}
        <div className="mt-4 ml-auto flex w-full max-w-[280px] flex-col gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
