import { ApplicationForm } from "@/components/farming-investment/application-form";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Apply for the farming programme",
  description:
    "Apply to the DB Plus farming programme: fertiliser and certified seed before the season, repayment in produce after harvest, terms in writing.",
  path: "/farming-investment/apply",
  keywords: [
    "farming programme application Tamale",
    "input credit application Ghana",
    "apply for farm inputs Northern Region",
  ],
});

export default function FarmingApplyPage() {
  return (
    <div className="texture-grain bg-surface">
      <section className="mx-auto max-w-[1312px] px-5 pb-10 pt-10 lg:px-8 lg:pb-14 lg:pt-20">
        <div className="max-w-[860px]">
          <div className="mb-4 flex items-center gap-2.5">
            <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
              FARMING INVESTMENT · APPLICATION
            </StencilLabel>
          </div>
          <h1 className="mb-4 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.015em] text-forest lg:mb-[18px] lg:text-[48px] lg:leading-[1.05]">
            Apply for the farming programme.
          </h1>
          <p className="text-[14px] leading-[1.65] text-soil lg:text-[16px] lg:leading-[1.7]">
            Inputs before the season, repayment in produce after harvest, and
            the terms in writing before anything is given out. Fill in what
            you can below - only your name and phone are required - and the
            office will call you to talk through the rest.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1312px] px-5 pb-16 lg:px-8 lg:pb-24">
        <div className="max-w-[860px]">
          <ApplicationForm />
        </div>
      </section>
    </div>
  );
}
