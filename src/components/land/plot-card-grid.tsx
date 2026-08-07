import Link from "next/link";
import { Photo, PhotoFallback } from "@/components/ui/Photo";
import { RegisterPager } from "@/components/ui/RegisterPager";
import { Stamp } from "@/components/ui/Stamp";
import { formatCedis } from "@/lib/format-money";
import { routes } from "@/lib/routes";
import { plotPhotos, plotSlug, type PublicLandPlot } from "@/lib/public-land";
import { cn } from "@/lib/utils";

/** Rows per server page of the plot register: four rows of the 2-up grid.
 * The /land route's fetch and the backend meta both speak this number. */
export const PLOT_PAGE_SIZE = 8;

/** The torn-ledger perforation strip down a plot document's left edge. */
function PerforatedEdge() {
  return (
    <div
      aria-hidden="true"
      className="border-r-[1.5px] border-dashed border-soil/45 bg-[radial-gradient(circle_at_13px_18px,#D9DECE_4px,transparent_4.5px)] bg-[length:26px_36px] bg-repeat-y"
    />
  );
}

function PlotCard({ plot }: { plot: PublicLandPlot }) {
  const available = plot.status === "AVAILABLE";
  const cover = plotPhotos(plot)[0];
  return (
    // A SUMMARY of the plot, opening its own page. The card used to carry the
    // gallery, the papers row and the whole description, which a documented
    // plot has far too much of to fit under a photograph; what is left is what
    // a buyer chooses between plots on.
    //
    // h-full is what lines a row of them up: the grid stretches every card to
    // the tallest in its row and the inner column pins READ MORE to the bottom
    // edge, so two plots side by side close on the same line whether one has a
    // long name and a stated use and the other has neither.
    <article className="shadow-doc group relative grid h-full grid-cols-[26px_1fr] border border-soil/35 bg-paper transition-[transform,box-shadow] duration-150 focus-within:shadow-[3px_3px_0_rgb(31_33_28/0.18)] hover:-translate-y-px hover:shadow-[3px_3px_0_rgb(31_33_28/0.18)]">
      <PerforatedEdge />
      <div className="flex min-w-0 flex-col">
        {/* A ratio, not a height: the photograph was 180/210px tall, which
            held across cards but cropped a portrait original to a letterbox.
            16:9 gives every plot the same picture shape at every width. */}
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b-[1.5px] border-soil/50">
          {cover ? (
            // "Reserved" is carried by the stamp and the muted action, never
            // by fogging the picture: a buyer is judging the land.
            <Photo
              src={cover.url}
              alt={cover.alt ?? `Plot ${plot.reference} - ${plot.name}`}
              fill
              sizes="(min-width: 1024px) 600px, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              fallback={<PhotoFallback className="absolute inset-0" />}
            />
          ) : (
            <PhotoFallback className="absolute inset-0" />
          )}
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col px-5 pb-6 pt-6 sm:px-7">
          {/* The reference reads as an eyebrow over the name rather than
              beside it. Sharing the line, it either squeezed the name down to
              a few characters a line on a fold-width screen or wrapped below
              it, which cost that one card a line nobody else spent. */}
          <span className="stencil mb-2 block whitespace-nowrap text-[11px] leading-none tracking-[0.14em] text-harvest-deep lg:text-[12px]">
            PLOT {plot.reference}
          </span>
          {/* Two lines reserved, so a one-line name and a two-line name still
              put the size row at the same height. */}
          <h3 className="mb-3 min-h-[2.6em] min-w-0 line-clamp-2 font-display text-[16px] font-bold leading-[1.25] text-forest [overflow-wrap:anywhere] lg:text-[18px]">
            {/* The whole card is the target; the overlay covers it. */}
            <Link
              href={routes.plot(plotSlug(plot))}
              className="focus-visible:outline-none"
            >
              <span aria-hidden="true" className="absolute inset-0 z-[1]" />
              {plot.name}
            </Link>
          </h3>
          {/* Two facts, on one line each, and nothing else. The card carried
              labelled ledger rows for size and price and a papers row of its
              own, which is a document rather than a summary - all of that is
              on the plot's page now. The size row holds two lines whether or
              not a use is on file. */}
          <p className="mb-1 min-h-[3.1em] line-clamp-2 text-[13px] leading-[1.55] text-soil [overflow-wrap:anywhere]">
            {plot.use ? `${plot.sizeText} · ${plot.use}` : plot.sizeText}
          </p>
          <p className="mb-[18px] text-[14px] font-bold text-forest">
            {plot.priceGhs == null
              ? "Price on request"
              : formatCedis(Number(plot.priceGhs))}
          </p>
          <span className="stencil mt-auto inline-flex items-center gap-1.5 self-start whitespace-nowrap text-[10px] tracking-[0.14em] text-forest transition-transform group-hover:translate-x-0.5">
            READ MORE →
          </span>
          <Stamp
            tone="leaf"
            className={cn(
              "absolute -top-6 right-5 text-[14px] tracking-[0.14em] lg:text-[15px]",
              available
                ? "rotate-[-5deg]"
                : "rotate-[3deg] border-soil text-soil [text-shadow:0_0_1px_rgb(89_82_59/0.5)]",
            )}
          >
            {available ? "Available" : "Reserved"}
          </Stamp>
        </div>
      </div>
    </article>
  );
}

/**
 * The plot register grid, server-paginated once it grows past a ledger page -
 * stencilled PAGE X OF Y between square PREV/NEXT blocks, exactly the
 * commodities register's pager so the two registers read as one system.
 * `plots` is ONE server page; the links carry `?page=N` back to the route.
 */
export function PlotCardGrid({
  basePath,
  page,
  plots,
  totalPages,
}: {
  /** The route the pager links back into, e.g. routes.land. */
  basePath: string;
  page: number;
  plots: PublicLandPlot[];
  totalPages: number;
}) {
  return (
    <div className="scroll-mt-24">
      {/* Stretch, not `items-start`: the row sizes to its tallest card and
          every card takes that height, which is the whole reason a card can
          pin its READ MORE to the bottom. */}
      <div className="grid gap-10 sm:grid-cols-2 lg:gap-[30px]">
        {plots.map((plot) => (
          <PlotCard key={plot.id} plot={plot} />
        ))}
      </div>
      <RegisterPager
        basePath={basePath}
        className="mt-9 lg:mt-11"
        label="Plot register pages"
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
