import Link from "next/link";
import type { PlotPhoto } from "@/components/land/plot-gallery";
import { Photo, PhotoFallback } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { Stamp } from "@/components/ui/Stamp";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { formatCedis } from "@/lib/format-money";
import { routes } from "@/lib/routes";
import { getSiteContact } from "@/lib/public-contact";
import { plotSlug, type PublicLandPlot } from "@/lib/public-land";
import { cn } from "@/lib/utils";

/** The torn-ledger perforation strip down a plot document's left edge. */
function PerforatedEdge() {
  return (
    <div
      aria-hidden="true"
      className="border-r-[1.5px] border-dashed border-soil/45 bg-[radial-gradient(circle_at_13px_18px,#D9DECE_4px,transparent_4.5px)] bg-[length:26px_36px] bg-repeat-y"
    />
  );
}

/**
 * A plot's photos in register order. `PublicLandPlot` (src/lib/public-land)
 * still types the cover photo alone, so the optional `photos` array the land
 * module carries - up to three per plot - is read structurally: the moment the
 * public endpoint ships it, every one of them shows here with no further
 * change. The single cover photo is the fallback.
 */
export function plotPhotos(plot: PublicLandPlot): PlotPhoto[] {
  const filed = (
    plot as PublicLandPlot & {
      photos?: { alt?: null | string; url: string }[];
    }
  ).photos;
  if (filed?.length) {
    return filed.map((photo) => ({ alt: photo.alt ?? null, url: photo.url }));
  }
  return plot.photo ? [{ alt: plot.photoAlt, url: plot.photo }] : [];
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

/** The empty ledger page - plots never render as a blank grid. */
async function EmptyRegister() {
  const contact = await getSiteContact();
  return (
    <article className="shadow-doc relative grid max-w-[860px] grid-cols-[26px_1fr] border border-soil/35 bg-paper">
      <PerforatedEdge />
      <div className="px-6 pb-10 pt-8 sm:px-12 lg:px-14 lg:pb-[60px] lg:pt-12">
        <div className="mb-7 flex items-baseline justify-between border-b-[1.5px] border-soil/50 pb-3">
          <span className="stencil text-[13px] tracking-[0.2em] text-ink">
            PLOT REGISTER
          </span>
          <span className="stencil text-[11px] tracking-[0.12em] text-harvest-deep">
            PAGE 01
          </span>
        </div>
        <div
          aria-hidden="true"
          className="relative mb-7 h-[170px] bg-[repeating-linear-gradient(180deg,transparent_0px,transparent_35px,rgb(89_82_59/0.28)_35px,rgb(89_82_59/0.28)_36px)] lg:h-[200px]"
        >
          <span className="stencil absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-5deg] whitespace-nowrap rounded-[5px] border-[3px] border-harvest-deep bg-surface/90 px-4 py-2.5 text-[15px] tracking-[0.16em] text-harvest-deep [text-shadow:0_0_1px_rgb(138_98_32/0.6)] lg:px-[22px] lg:py-3 lg:text-[22px]"
          >
            NO PLOTS ON FILE
          </span>
        </div>
        <p className="mb-6 max-w-[52ch] text-[14px] leading-[1.65] text-soil lg:text-[15px]">
          Plots are added to the register as they become available. Leave your
          details and we&rsquo;ll contact you first when the next one is ready.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href={`${routes.contact}?subject=${encodeURIComponent("Land / plots")}`}
            className="shadow-block inline-block rounded-[2px] bg-harvest px-[26px] py-3.5 text-[14px] font-bold text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#1F211C]"
          >
            Tell us what you&rsquo;re looking for
          </Link>
          <a
            href={contact.phoneHref}
            className="shadow-doc-sm inline-block rounded-[2px] border-2 border-forest px-6 py-3 text-[14px] font-bold text-forest transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)]"
          >
            Call us
          </a>
        </div>
      </div>
    </article>
  );
}

/** CURRENT PLOT FILES - the live register grid, or the empty ledger page. */
export function PlotFiles({ plots }: { plots: PublicLandPlot[] }) {
  return (
    <section className="mx-auto max-w-[1312px] px-5 pb-16 lg:px-8 lg:pb-24">
      <div className="mb-9 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 lg:mb-[34px]">
        <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
          CURRENT PLOT FILES
        </StencilLabel>
        <span className="text-[13px] font-medium text-soil">
          Plots are added as they become available.
        </span>
      </div>
      {plots.length === 0 ? (
        <EmptyRegister />
      ) : (
        <Reveal>
          {/* Stretch, not `items-start`: the row sizes to its tallest card and
              every card takes that height, which is the whole reason a card
              can pin its READ MORE to the bottom. The second card in each pair
              also used to be dropped 44px for a scattered-desk look - with two
              cards of honestly different heights beside it, that read as a
              mistake rather than a flourish. Two columns from sm, so the
              picture ratio never has a full-page width to fill. */}
          <div className="grid gap-10 sm:grid-cols-2 lg:gap-[30px]">
            {plots.map((plot) => (
              <PlotCard key={plot.id} plot={plot} />
            ))}
          </div>
        </Reveal>
      )}
    </section>
  );
}
