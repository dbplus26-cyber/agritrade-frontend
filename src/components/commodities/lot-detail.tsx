import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { Stamp } from "@/components/ui/Stamp";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { routes } from "@/lib/routes";
import type { PublicLot } from "@/lib/public-commodities";
import { cn } from "@/lib/utils";

/**
 * One commodity, read in full.
 *
 * The full document treatment - photograph, filed paper, stock stamp - which
 * every lot gets on its own page. The register's cards hold the identifying
 * facts and a clamped line or two of the description; everything the office
 * keeps on the record is here.
 */
export function LotDetail({ lot }: { lot: PublicLot }) {
  const specs = [
    { label: "VARIETY", value: lot.variety },
    { label: "QUALITY GRADE", value: lot.qualityGrade },
    { label: "DESCRIPTION", value: lot.description },
  ].filter((row) => Boolean(row.value));

  return (
    <div className="texture-grain relative overflow-hidden bg-surface">
      {/* The cropped ghost, the same idiom the register and the enquiry page
          use. Decorative and aria-hidden: the name is already the heading. */}
      <span
        aria-hidden="true"
        className="stencil absolute -left-14 top-[190px] z-0 hidden select-none whitespace-nowrap text-[90px] leading-none tracking-[0.02em] text-soil/[0.09] sm:block lg:-left-24 lg:top-[150px] lg:text-[190px]"
      >
        {lot.ghost}
      </span>

      {/* One centred column, and the picture sits ON TOP of the paper rather
          than beside it. Side by side, the heading and the facts each got half
          a page and a long description ran as a narrow ribbon down one of
          them; stacked, everything is read at the same measure. */}
      <div className="relative z-[2] mx-auto max-w-[880px] px-5 pb-16 pt-8 lg:px-8 lg:pb-24 lg:pt-12">
        {/* Its own row: BackButton is inline-flex, so the file label
            below sat beside it rather than under it. */}
        <div className="mb-4">
          <BackButton href={routes.commodities} label="The board" />
        </div>
        <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
          {lot.lotNo} · COMMODITY FILE
        </StencilLabel>
        <h1 className="mt-3 font-display text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-forest [overflow-wrap:anywhere] lg:text-[38px] lg:leading-[1.1]">
          {lot.name}
        </h1>

        <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:gap-10">
          {/* No photograph on file means no frame: on a page about one record
              an empty picture box says nothing the reader needs. */}
          <PhotoFrame
            alt={lot.photoAlt}
            className="h-[240px] border border-soil/30 shadow-[6px_6px_0_rgb(31_33_28/0.18)] sm:h-[360px] lg:h-[440px]"
            priority
            sizes="(min-width: 1024px) 880px, 100vw"
            src={lot.photo}
          />

          <div className="shadow-doc relative border border-soil/35 bg-surface-alt p-6 sm:p-9 lg:p-10">
            <Stamp
              tone="leaf"
              className={cn(
                "absolute -top-5 right-3 text-[13px] tracking-[0.14em] lg:-top-6 lg:right-8 lg:rotate-[4deg] lg:text-[14px]",
                !lot.inStock &&
                  "border-dashed border-soil text-soil [text-shadow:0_0_1px_rgb(89_82_59/0.5)]",
              )}
            >
              {lot.inStock ? "In stock" : "On order"}
            </Stamp>

            {specs.length > 0 ? (
              <dl className="mb-7 flex flex-col gap-3.5">
                {specs.map((row) => (
                  <div key={row.label} className="flex flex-col gap-1">
                    <dt className="stencil text-[10px] tracking-[0.14em] text-harvest-deep lg:text-[11px]">
                      {row.label}
                    </dt>
                    <dd className="m-0 border-b border-dotted border-soil/40 pb-1.5 text-[13.5px] leading-[1.65] text-ink [overflow-wrap:anywhere] lg:text-[14px]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mb-7 text-[13.5px] leading-[1.65] text-soil">
                No further detail is filed against this commodity yet. Call the
                office for the current specification and position.
              </p>
            )}

            <Link
              href={`${routes.contact}?subject=${encodeURIComponent(lot.subject)}`}
              className={cn(
                "inline-block rounded-[2px] text-[14px] font-bold transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px",
                lot.inStock
                  ? "shadow-block bg-harvest px-[26px] py-3.5 text-ink hover:shadow-[2px_2px_0_#1F211C]"
                  : "shadow-doc-sm border-2 border-forest px-6 py-3 text-forest hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)]",
              )}
            >
              Enquire about this commodity
            </Link>
            <p className="mt-3 text-[12.5px] leading-[1.55] text-soil">
              No prices posted - the market moves daily. Call with tonnage and
              destination for a same-day quote.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
