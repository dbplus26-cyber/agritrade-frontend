import { DocCard } from "@/components/ui/DocCard";
import { StencilLabel } from "@/components/ui/StencilLabel";

const CHECKLIST = [
  "Site plan and indenture shown and checked",
  "Boundary walked together, pillar to pillar",
  "Transfer completed in your name before the sale closes",
];

/** Editorial intro - ghost "PLOTS", papers-first pitch, BEFORE YOU PAY card. */
export function LandIntro() {
  return (
    // overflow-x-clip crops the ghost word at the canvas edge without ever
    // creating a horizontal scrollbar (and without clipping vertically).
    <section className="relative overflow-x-clip px-5 pb-12 pt-10 lg:px-0 lg:pb-[72px] lg:pt-20">
      <span
        aria-hidden="true"
        className="stencil absolute -right-12 top-10 z-0 select-none whitespace-nowrap text-[100px] leading-none tracking-[0.02em] text-soil/14 lg:-right-36 lg:top-4 lg:text-[210px]"
      >
        PLOTS
      </span>
      <div className="relative mx-auto grid max-w-[1312px] items-start gap-9 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:px-8">
        <div className="relative z-[2]">
          <StencilLabel className="text-[11px] tracking-[0.32em] lg:text-[12px]">
            LAND · PLOT FILES - TML
          </StencilLabel>
          <h1 className="mb-5 mt-4 font-display text-[36px] font-bold leading-[1.05] tracking-[-0.015em] text-forest lg:mb-6 lg:text-[66px] lg:leading-[1.02]">
            Plots around Tamale,
            <br />
            sold{" "}
            <span className="shadow-[inset_0_-12px_0_rgb(216_156_46/0.55)]">
              papers first.
            </span>
          </h1>
          <p className="mb-3.5 max-w-[54ch] text-[14.5px] leading-[1.7] text-soil lg:text-[17px]">
            We sell plots we hold ourselves, in areas we know. Every plot comes
            with its site plan and indenture, and we walk the boundary with you
            - pillar to pillar - before any money changes hands.
          </p>
          <p className="max-w-[54ch] text-[14.5px] leading-[1.7] text-soil lg:text-[17px]">
            Buying is simple: view, confirm the papers, agree terms, pay,
            transfer in your name.
          </p>
        </div>
        <DocCard title="BEFORE YOU PAY" fileNo="CHECKLIST" className="relative z-[2] lg:mt-[34px]">
          <div className="flex flex-col px-6 pb-4 pt-1 sm:px-8">
            {CHECKLIST.map((item, i) => (
              <div
                key={item}
                className={`flex gap-3.5 py-3 text-[14px] leading-[1.55] text-ink ${
                  i < CHECKLIST.length - 1
                    ? "border-b border-dotted border-soil/40"
                    : ""
                }`}
              >
                <span aria-hidden="true" className="stencil text-[14px] text-leaf">
                  ☐
                </span>
                {item}
              </div>
            ))}
          </div>
        </DocCard>
      </div>
    </section>
  );
}
