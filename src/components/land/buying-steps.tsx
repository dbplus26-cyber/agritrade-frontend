import { Reveal } from "@/components/ui/Reveal";
import { StencilLabel } from "@/components/ui/StencilLabel";

const STEPS = [
  { no: "01", title: "View the plot", note: "See it with us, on the ground." },
  { no: "02", title: "Check the papers", note: "Site plan and indenture, in hand." },
  { no: "03", title: "Walk the boundary", note: "Pillar to pillar, together." },
  { no: "04", title: "Pay & transfer", note: "In your name before the sale closes." },
];

/** How buying works - a compact numbered strip between the intro and the
 * register, so the papers-first promise reads as a concrete sequence. */
export function BuyingSteps() {
  return (
    <section
      aria-label="How buying a plot works"
      className="mx-auto max-w-[1312px] px-5 pb-12 lg:px-8 lg:pb-16"
    >
      <Reveal>
        <StencilLabel className="mb-5 block text-[11px] tracking-[0.3em] lg:text-[12px]">
          HOW BUYING WORKS
        </StencilLabel>
        <div className="grid grid-cols-1 border-y-[1.5px] border-soil/50 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.no}
              className={`flex gap-3.5 px-1 py-4 sm:px-5 lg:py-5 ${
                i > 0
                  ? "border-t border-dotted border-soil/40 sm:border-t-0 sm:border-l"
                  : ""
              } ${i >= 2 ? "max-lg:sm:border-t" : ""} ${i === 2 ? "max-lg:sm:border-l-0" : ""}`}
            >
              <span className="stencil pt-0.5 text-[14px] tracking-[0.08em] text-harvest-deep">
                {step.no}
              </span>
              <div>
                <h3 className="mb-0.5 font-display text-[15px] font-semibold text-forest lg:text-[16px]">
                  {step.title}
                </h3>
                <p className="text-[12.5px] leading-[1.55] text-soil">
                  {step.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
