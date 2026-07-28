import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { routes } from "@/lib/routes";

const TRADING_PHOTO =
  "https://commons.wikimedia.org/wiki/Special:FilePath/A%20section%20of%20traders%20in%20Tamale%20Aboabo%20market%2001.jpg?width=1000";

/** One of the stacked file cards (Land / Farming investment). */
function FileCard({
  header,
  fileNo,
  title,
  body,
  footer,
  href,
}: {
  header: string;
  fileNo: string;
  title: string;
  body: string;
  footer: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="shadow-doc flex flex-1 flex-col justify-between border border-soil/35 bg-surface-alt p-6 text-ink transition-[transform,box-shadow] duration-150 hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_rgb(31_33_28/0.18)] sm:p-7"
    >
      <div className="mb-4 flex items-baseline justify-between border-b-[1.5px] border-soil/50 pb-2.5">
        <span className="stencil text-[12px] tracking-[0.2em] text-ink">{header}</span>
        <span className="stencil text-[11px] tracking-[0.12em] text-harvest-deep">
          {fileNo}
        </span>
      </div>
      <div>
        <h3 className="mb-1.5 font-display text-[22px] font-bold text-forest lg:text-[25px]">
          {title}
        </h3>
        <p className="text-[13.5px] leading-[1.6] text-soil">{body}</p>
        <div className="mt-4 flex items-center justify-between border-t border-dotted border-soil/45 pt-3">
          <span className="stencil text-[12px] tracking-[0.16em] text-harvest-deep">
            {footer}
          </span>
          <span aria-hidden="true" className="stencil text-[18px] text-harvest-deep">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Three lines of business — big trading card + the stacked file pair. */
export function BusinessLines() {
  return (
    <section className="mx-auto max-w-[1312px] px-5 pb-16 lg:px-8 lg:pb-[104px]">
      <div className="mb-7 flex items-baseline gap-5 lg:mb-[34px]">
        <StencilLabel className="text-[12px] tracking-[0.3em]">
          THREE LINES OF BUSINESS
        </StencilLabel>
        <span aria-hidden="true" className="relative -top-[3px] flex-1 border-t-[1.5px] border-soil/50" />
      </div>
      <Reveal>
      <div className="grid items-stretch gap-6 lg:grid-cols-[1.55fr_1fr] lg:gap-[26px]">
        <Link
          href={routes.commodities}
          className="shadow-doc relative flex flex-col border border-soil/35 bg-paper text-ink transition-[transform,box-shadow] duration-150 hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_rgb(31_33_28/0.18)]"
        >
          <div className="relative h-[200px] border-b-[1.5px] border-soil/50 sm:h-[290px]">
            <Image
              src={TRADING_PHOTO}
              alt="Traders at Tamale Aboabo market"
              fill
              sizes="(min-width: 1024px) 760px, 100vw"
              className="object-cover"
            />
            {/* The stencil tag carries its own ink plate, so the photo needs
                no scrim under it and renders at true colour. */}
            <span className="stencil absolute left-4 top-4 bg-ink/70 px-[11px] py-1.5 text-[12px] tracking-[0.16em] text-surface">
              LOT FILE — GRAIN
            </span>
          </div>
          <div className="flex flex-1 items-end justify-between gap-6 p-6 sm:p-7">
            <div>
              <h3 className="mb-2 font-display text-[24px] font-bold text-forest lg:text-[30px]">
                Commodity trading
              </h3>
              <p className="max-w-[44ch] text-[14px] leading-[1.6] text-soil">
                Maize, soya beans and groundnuts by the truckload — graded,
                bagged and weighed over a certified scale.
              </p>
            </div>
            <span aria-hidden="true" className="stencil flex-none text-[22px] text-harvest-deep">
              →
            </span>
          </div>
        </Link>
        <div className="flex flex-col gap-6 lg:gap-[26px]">
          <FileCard
            header="PLOT FILE — TML"
            fileNo="N° 02"
            title="Land"
            body="Documented plots in and around Tamale — papers first, boundary walked together."
            footer="SEE PLOTS"
            href={routes.land}
          />
          <FileCard
            header="SCHEME LEDGER"
            fileNo="N° 03"
            title="Farming investment"
            body="Inputs before the season, repaid in produce after harvest. Partners share returns."
            footer="HOW IT WORKS"
            href={routes.farmingInvestment}
          />
        </div>
      </div>
      </Reveal>
    </section>
  );
}
