import Link from "next/link";
import { PlankRows } from "@/components/shared/plank-rows";
import { routes } from "@/lib/routes";
import type { CommodityLine } from "@/static-data/availability";

/**
 * The signature element: the warehouse plank board (home edition). The shared
 * planks live in `shared/plank-rows`; this wraps them with the "TODAY AT THE
 * WAREHOUSE" header and a single quiet footer — one caption, one action
 * (FULL BOARD). Other grains, prices and the rest live on /commodities, so
 * the board never reads as a wall of buttons. Forest (not board-black) keeps
 * the section from going heavy while the planks stay dark against it.
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
      aria-label="Today at the warehouse — commodity availability"
      className="texture-grain-dark relative z-[1] bg-forest px-5 pb-9 pt-10 lg:-mt-[70px] lg:px-0 lg:pt-[110px]"
    >
      <div className="mx-auto max-w-[1312px] lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 lg:mb-[18px]">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-[9px] w-[9px] rounded-full bg-harvest shadow-[0_0_0_4px_rgb(216_156_46/0.2)]"
            />
            <span className="stencil text-[12px] tracking-[0.34em] text-surface lg:text-[15px]">
              TODAY AT THE WAREHOUSE
            </span>
          </div>
          <span className="text-[12px] tracking-[0.08em] text-surface/70">
            Updated {updatedOn} · from our stock records
          </span>
        </div>

        {/* The home board is a teaser: at most 4 planks. FULL BOARD below is
            the path to the complete register on /commodities. */}
        <PlankRows lines={lines.slice(0, 4)} />

        <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <span className="max-w-[60ch] text-[12.5px] leading-[1.6] text-surface/70">
            Other grains &amp; pulses on request. No prices posted — the market
            moves daily; call for a same-day quote.
          </span>
          <Link
            href={routes.commodities}
            className="stencil inline-block whitespace-nowrap rounded-[2px] border-[1.5px] border-harvest/65 px-[18px] py-[11px] text-[13px] leading-none tracking-[0.16em] text-harvest transition-colors hover:bg-harvest/12 hover:text-surface lg:text-[14px]"
          >
            FULL BOARD →
          </Link>
        </div>
      </div>
    </section>
  );
}
