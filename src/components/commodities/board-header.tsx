import { StockRegister } from "@/components/shared/stock-register";
import { StencilLabel } from "@/components/ui/StencilLabel";
import type { CommodityLine } from "@/static-data/availability";

/** The commodities page opens ON the register - eyebrow, H1 and the filed
 * rows. Same restraint as the home section, and the same document tint: the
 * near-black band this used to sit in was the heaviest thing on either page. */
export function BoardHeader({
  updatedOn,
  lines,
}: {
  updatedOn: string;
  lines: CommodityLine[];
}) {
  return (
    <section
      aria-label="The board - commodity availability"
      className="texture-grain mt-6 bg-surface-alt px-5 pb-12 pt-10 lg:mt-[34px] lg:px-0 lg:pb-14 lg:pt-14"
    >
      <div className="mx-auto max-w-[1312px] lg:px-8">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:mb-[22px] lg:flex-row lg:items-end lg:gap-10">
          <div>
            <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
              THE BOARD
            </StencilLabel>
            <h1 className="mt-3 font-display text-[32px] font-bold leading-[1.1] text-forest lg:text-[52px] lg:leading-[1.05]">
              What&rsquo;s in the warehouse today.
            </h1>
          </div>
          <div className="flex items-center gap-2.5 lg:pb-2.5">
            <span
              aria-hidden="true"
              className="h-[9px] w-[9px] flex-none rounded-full bg-harvest shadow-[0_0_0_4px_rgb(216_156_46/0.22)]"
            />
            <span className="text-[12px] font-medium text-soil/85 lg:whitespace-nowrap lg:text-[13px]">
              Updated {updatedOn} · from our stock records
            </span>
          </div>
        </div>

        <StockRegister lines={lines} />

        <p className="mt-4 max-w-[72ch] text-[12.5px] leading-[1.6] text-soil">
          Other grains &amp; pulses on request. No prices, no stock figures
          posted - the market moves daily; call with tonnage and destination
          for a same-day quote.
        </p>
      </div>
    </section>
  );
}
