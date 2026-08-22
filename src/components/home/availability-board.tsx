import Link from "next/link";
import { StockRegister } from "@/components/shared/stock-register";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { routes } from "@/lib/routes";
import type { CommodityLine } from "@/static-data/availability";

/**
 * "Today at the warehouse": what is in stock, right under the hero. The rows
 * live in `shared/stock-register`; this wraps them with the section caption,
 * the updated stamp and a single action (FULL BOARD). Prices and the rest of
 * the register live on /commodities, so this never reads as a wall of buttons.
 *
 * The section sits on the document tint rather than a near-black band. One
 * heavy dark block directly under the hero would be the loudest thing on the
 * page and the only one of its kind on the site; the alternating husk tone
 * still separates the section from the hero above it, and lets the register
 * read as paper like every other document here.
 */
export function AvailabilityBoard({
  updatedOn,
  lines,
}: {
  updatedOn: string;
  lines: CommodityLine[];
}) {
  return (
    <section
      aria-label="Today at the warehouse - commodity availability"
      className="texture-grain relative z-[1] bg-surface-alt px-5 pb-12 pt-10 lg:-mt-[70px] lg:px-0 lg:pb-14 lg:pt-[110px]"
    >
      <div className="mx-auto max-w-[1312px] lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 lg:mb-5">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-[9px] w-[9px] rounded-full bg-harvest shadow-[0_0_0_4px_rgb(216_156_46/0.22)]"
            />
            <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
              TODAY AT THE WAREHOUSE
            </StencilLabel>
          </div>
          <span className="text-[12px] text-soil/85 lg:text-[12.5px]">
            Updated {updatedOn} · from our stock records
          </span>
        </div>

        {/* The home register is a teaser: at most 4 lines. FULL BOARD below is
            the path to the complete register on /commodities. */}
        <StockRegister lines={lines.slice(0, 4)} />

        <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <span className="max-w-[60ch] text-[12.5px] leading-[1.6] text-soil">
            Other grains &amp; pulses on request. No prices posted - the market
            moves daily; call for a same-day quote.
          </span>
          <Link
            href={routes.commodities}
            className="stencil inline-block whitespace-nowrap rounded-[2px] border-[1.5px] border-forest/45 px-[18px] py-[11px] text-[12px] leading-none tracking-[0.16em] text-forest transition-colors hover:bg-forest/6 lg:text-[13px]"
          >
            FULL BOARD →
          </Link>
        </div>
      </div>
    </section>
  );
}
