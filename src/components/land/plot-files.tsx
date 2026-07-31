import Link from "next/link";
import { PlotGallery, type PlotPhoto } from "@/components/land/plot-gallery";
import { Reveal } from "@/components/ui/Reveal";
import { Stamp } from "@/components/ui/Stamp";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { formatCedis } from "@/lib/format-money";
import { routes } from "@/lib/routes";
import { getSiteContact } from "@/lib/public-contact";
import type { PublicLandPlot } from "@/lib/public-land";
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

/** Phones stack the label above its value; sm+ keeps the ledger columns. */
function PlotRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // The value sits UNDER its label at every width. As a label-left ledger
    // the 110px column stood empty for all but the first line of a long size
    // convention, leaving a caption stranded at the top of a tall blank
    // column and distorting the card.
    <div className="flex flex-col gap-1">
      <dt className="stencil text-[10px] tracking-[0.14em] text-harvest-deep">
        {label}
      </dt>
      <dd className="m-0 border-b border-dotted border-soil/40 pb-[5px] text-[13.5px] leading-[1.55] text-ink lg:text-[14px]">
        {children}
      </dd>
    </div>
  );
}

/**
 * A plot's photos in register order. `PublicLandPlot` (src/lib/public-land)
 * still types the cover photo alone, so the optional `photos` array the land
 * module carries - up to three per plot - is read structurally: the moment the
 * public endpoint ships it, every one of them shows here with no further
 * change. The single cover photo is the fallback.
 */
function plotPhotos(plot: PublicLandPlot): PlotPhoto[] {
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

function PlotCard({ plot, offset }: { plot: PublicLandPlot; offset: boolean }) {
  const available = plot.status === "AVAILABLE";
  const photos = plotPhotos(plot);
  const enquiryHref = `${routes.contact}?subject=${encodeURIComponent("Land / plots")}&about=${encodeURIComponent(`Plot ${plot.reference} - ${plot.name}`)}`;
  return (
    <article
      className={cn(
        "shadow-doc relative grid grid-cols-[26px_1fr] border border-soil/35 bg-paper",
        offset && "lg:mt-11",
      )}
    >
      <PerforatedEdge />
      <div>
        {photos.length > 0 ? (
          // "Reserved" is carried by the stamp and the muted enquiry button,
          // never by fogging the picture.
          <PlotGallery
            fallbackAlt={`Plot ${plot.reference} - ${plot.name}`}
            photos={photos}
          />
        ) : (
          // No photo on file yet: the ruled ledger paper keeps the card's
          // document framing instead of a broken image slot.
          <div className="relative h-[180px] border-b-[1.5px] border-soil/50 sm:h-[210px]">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0px,transparent_35px,rgb(89_82_59/0.28)_35px,rgb(89_82_59/0.28)_36px)]"
            >
              <span className="stencil absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] whitespace-nowrap text-[13px] tracking-[0.16em] text-soil">
                PHOTO TO FOLLOW
              </span>
            </div>
          </div>
        )}
        <div className="relative px-5 pb-6 pt-6 sm:px-7">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="min-w-0 font-display text-[16px] font-bold leading-[1.25] text-forest [overflow-wrap:anywhere] lg:text-[18px]">
              {plot.name}
            </h3>
            <span className="stencil text-[11px] tracking-[0.14em] text-harvest-deep lg:text-[12px]">
              PLOT {plot.reference}
            </span>
          </div>
          <dl className="mb-[18px] flex flex-col gap-2.5 sm:gap-1.5">
            <PlotRow label="SIZE">
              {plot.use ? `${plot.sizeText} · ${plot.use}` : plot.sizeText}
            </PlotRow>
            {plot.priceGhs != null ? (
              <PlotRow label="PRICE">
                <span className="font-bold text-forest">
                  {formatCedis(Number(plot.priceGhs))}
                </span>
              </PlotRow>
            ) : null}
            {plot.description ? (
              // Printed IN FULL: a plot has no page of its own to open, so
              // this card is the only place the owner's description exists.
              <PlotRow label="ABOUT THIS PLOT">
                <span className="[overflow-wrap:anywhere]">
                  {plot.description}
                </span>
              </PlotRow>
            ) : null}
            <PlotRow label="PAPERS">
              <span className="flex flex-wrap items-center gap-1.5">
                {["Site plan", "Indenture"].map((paper) => (
                  <span
                    key={paper}
                    className="stencil rounded-[2px] border border-leaf/55 px-2 py-1 text-[9px] leading-none tracking-[0.12em] text-forest"
                  >
                    {paper.toUpperCase()} ✓
                  </span>
                ))}
                <span className="text-[12.5px] text-soil">on file</span>
              </span>
            </PlotRow>
          </dl>
          <Link
            href={enquiryHref}
            className={cn(
              "inline-block rounded-[2px] border-2 px-6 py-3 text-[14px] font-bold transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px",
              available
                ? "shadow-doc-sm border-forest text-forest hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)]"
                : "border-soil/55 text-soil shadow-[3px_3px_0_rgb(89_82_59/0.3)] hover:text-ink hover:shadow-[2px_2px_0_rgb(89_82_59/0.3)]",
            )}
          >
            {available ? "Enquire about this plot" : "Ask about similar plots"}
          </Link>
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

/** The empty ledger page — plots never render as a blank grid. */
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
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-[30px]">
            {plots.map((plot, i) => (
              <PlotCard key={plot.id} plot={plot} offset={i % 2 === 1} />
            ))}
          </div>
        </Reveal>
      )}
    </section>
  );
}
