import Link from "next/link";
import { AudienceCards } from "@/components/farming-investment/audience-cards";
import { SchemeFile } from "@/components/farming-investment/scheme-file";
import { SeasonTimeline } from "@/components/farming-investment/season-timeline";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Farming investment",
  description:
    "Inputs before the season, repaid in produce after harvest. Farmers get fertiliser and seed; partners who fund the scheme share the returns - terms in writing.",
  path: "/farming-investment",
  keywords: [
    "input credit scheme Ghana",
    "farming investment Tamale",
    "fund a farming season",
    "outgrower scheme Northern Region",
  ],
});

export default function FarmingInvestmentPage() {
  return (
    <div className="texture-grain bg-surface">
      <section className="mx-auto max-w-[1312px] px-5 pb-10 pt-10 lg:px-8 lg:pb-16 lg:pt-20">
        <div className="max-w-[900px]">
        <div className="mb-4 flex items-center gap-2.5">
          <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
            FARMING INVESTMENT
          </StencilLabel>
        </div>
        <h1 className="mb-4 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.015em] text-forest lg:mb-[18px] lg:text-[52px] lg:leading-[1.05]">
          Inputs before the season. Repayment after harvest.
        </h1>
        <p className="text-[14px] leading-[1.65] text-soil lg:text-[17px] lg:leading-[1.7]">
          We give farmers fertiliser and seed at the start of the season. After
          harvest, they repay in produce at an agreed rate - no cash loan, no
          interest rate to track. Partners who fund the scheme share in the
          returns when the produce is sold. It&rsquo;s a lending relationship,
          and we treat it like one: terms in writing, weights on a certified
          scale, records kept for both sides.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 lg:mt-8">
          <Link
            href={routes.farmingApply}
            className="shadow-block inline-block rounded-[2px] bg-harvest px-[26px] py-3.5 text-[14px] font-bold text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#1F211C] max-sm:w-full max-sm:text-center"
          >
            Apply for the programme
          </Link>
        </div>
        </div>
      </section>
      <AudienceCards />
      <SchemeFile />
      <SeasonTimeline />
    </div>
  );
}
