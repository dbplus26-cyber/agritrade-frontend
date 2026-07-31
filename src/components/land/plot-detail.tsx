import Link from "next/link";
import { PlotGallery } from "@/components/land/plot-gallery";
import { plotPhotos } from "@/components/land/plot-files";
import { BackButton } from "@/components/ui/BackButton";
import { PhotoFallback } from "@/components/ui/Photo";
import { Stamp } from "@/components/ui/Stamp";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { formatCedis } from "@/lib/format-money";
import { routes } from "@/lib/routes";
import { getSiteContact } from "@/lib/public-contact";
import type { PublicLandPlot } from "@/lib/public-land";
import { cn } from "@/lib/utils";

/** A row of the plot's file: the value under its label, at every width. */
function PlotRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="stencil text-[10px] tracking-[0.14em] text-harvest-deep lg:text-[11px]">
        {label}
      </dt>
      <dd className="m-0 border-b border-dotted border-soil/40 pb-1.5 text-[13.5px] leading-[1.65] text-ink [overflow-wrap:anywhere] lg:text-[14px]">
        {children}
      </dd>
    </div>
  );
}

/**
 * One plot, read in full: every photo the office has filed, the size and price
 * convention, what papers exist, and the owner's own description. The register
 * card carries the identifying facts and sends the reader here.
 */
export async function PlotDetail({ plot }: { plot: PublicLandPlot }) {
  const contact = await getSiteContact();
  const available = plot.status === "AVAILABLE";
  const photos = plotPhotos(plot);
  const enquiryHref = `${routes.contact}?subject=${encodeURIComponent("Land / plots")}&about=${encodeURIComponent(`Plot ${plot.reference} - ${plot.name}`)}`;

  return (
    <div className="texture-grain bg-surface">
      {/* One centred column with the gallery above the file, for the same
          reason as the commodity page: side by side, the heading and the plot's
          own facts each got half a page. */}
      <div className="mx-auto max-w-[880px] px-5 pb-16 pt-8 lg:px-8 lg:pb-24 lg:pt-12">
        {/* Its own row: BackButton is inline-flex, so the file label
            below sat beside it rather than under it. */}
        <div className="mb-4">
          <BackButton href={routes.land} label="All plots" />
        </div>
        <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
          PLOT {plot.reference} · PLOT FILE
        </StencilLabel>
        <h1 className="mt-3 font-display text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-forest [overflow-wrap:anywhere] lg:text-[38px] lg:leading-[1.1]">
          {plot.name}
        </h1>

        <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:gap-10">
          <div className="shadow-doc-dark relative border border-soil/30">
            {photos.length > 0 ? (
              <PlotGallery
                className="h-[240px] border-b-0 sm:h-[360px] lg:h-[440px]"
                fallbackAlt={`Plot ${plot.reference} - ${plot.name}`}
                photos={photos}
              />
            ) : (
              <div className="relative h-[240px] sm:h-[360px] lg:h-[440px]">
                <PhotoFallback className="absolute inset-0" />
              </div>
            )}
          </div>

          <div className="shadow-doc relative border border-soil/35 bg-surface-alt p-6 sm:p-9 lg:p-10">
            <Stamp
              tone="leaf"
              className={cn(
                "absolute -top-5 right-3 text-[13px] tracking-[0.14em] lg:-top-6 lg:right-8 lg:text-[14px]",
                available
                  ? "lg:rotate-[-4deg]"
                  : "border-soil text-soil [text-shadow:0_0_1px_rgb(89_82_59/0.5)] lg:rotate-[3deg]",
              )}
            >
              {available ? "Available" : "Reserved"}
            </Stamp>

            <dl className="mb-7 flex flex-col gap-3.5">
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
                <PlotRow label="ABOUT THIS PLOT">{plot.description}</PlotRow>
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

            <div className="flex flex-wrap items-center gap-3">
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
              {contact.hasPhone ? (
                <a
                  href={contact.phoneHref}
                  className="text-[13.5px] font-bold text-forest underline decoration-harvest decoration-2 underline-offset-4"
                >
                  or call {contact.phone}
                </a>
              ) : null}
            </div>
            <p className="mt-3.5 text-[12.5px] leading-[1.55] text-soil">
              Papers first: the site plan and indenture are checked and the
              boundary walked pillar to pillar before any money changes hands.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
