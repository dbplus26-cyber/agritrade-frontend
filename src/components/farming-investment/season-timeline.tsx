import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    no: "1",
    dot: "bg-forest text-harvest",
    title: "Inputs given",
    body: "Fertiliser and seed issued to registered farmers before planting.",
    months: "APR – MAY",
  },
  {
    no: "2",
    dot: "bg-leaf text-surface",
    title: "Growing season",
    body: "Field agents visit farms and keep both sides informed.",
    months: "JUN – SEP",
  },
  {
    no: "3",
    dot: "bg-harvest text-ink",
    title: "Harvest",
    body: "Crops come in; farmers set aside the agreed repayment share.",
    months: "OCT – NOV",
  },
  {
    no: "4",
    dot: "bg-soil text-surface",
    title: "Repayment in produce",
    body: "Produce delivered, weighed and recorded. Partners' returns settled after sale.",
    months: "NOV – JAN",
  },
];

/**
 * The season cycle - a numbered horizontal timeline on desktop (connector
 * line behind the dots), collapsing to the vertical ledger line on mobile.
 */
export function SeasonTimeline() {
  return (
    <section className="border-t border-soil/14 bg-surface-alt px-5 py-12 lg:px-0 lg:py-[72px]">
      <Reveal className="mx-auto max-w-[1312px] lg:px-8">
        <SectionHeading
          eyebrow="HOW THE SEASON WORKS"
          title="One cycle, four stages."
          className="mb-8 lg:mb-12"
        />

        {/* Desktop: four columns over a connector line. */}
        <div className="relative hidden grid-cols-4 lg:grid">
          <div
            aria-hidden="true"
            className="absolute left-[10%] right-[10%] top-[19px] h-0.5 bg-soil/25"
          />
          {STAGES.map((stage) => (
            <div
              key={stage.no}
              className="relative flex flex-col items-center px-6 text-center"
            >
              <span
                className={cn(
                  "mb-[18px] grid h-10 w-10 place-items-center rounded-full border-[3px] border-surface-alt font-display text-[15px] font-bold shadow-[0_0_0_1px_rgb(89_82_59/0.25)]",
                  stage.dot,
                )}
              >
                {stage.no}
              </span>
              <h3 className="mb-1.5 font-display text-[18px] font-semibold text-forest">
                {stage.title}
              </h3>
              <p className="mb-1.5 text-[13px] leading-[1.6] text-soil">
                {stage.body}
              </p>
              <span className="text-[11px] font-bold tracking-[0.16em] text-harvest-deep">
                {stage.months}
              </span>
            </div>
          ))}
        </div>

        {/* Mobile: vertical ledger line. */}
        <div className="relative flex flex-col lg:hidden">
          <div
            aria-hidden="true"
            className="absolute bottom-8 left-[17px] top-5 w-0.5 bg-soil/25"
          />
          {STAGES.map((stage, i) => (
            <div
              key={stage.no}
              className={cn("relative flex gap-[18px]", i < STAGES.length - 1 && "pb-[26px]")}
            >
              <span
                className={cn(
                  "grid h-9 w-9 flex-none place-items-center rounded-full border-[3px] border-surface-alt font-display text-[14px] font-bold",
                  stage.dot,
                )}
              >
                {stage.no}
              </span>
              <div>
                <h3 className="mb-1 mt-0.5 font-display text-[16px] font-semibold text-forest">
                  {stage.title}{" "}
                  <span className="ml-1.5 text-[10px] font-bold tracking-[0.14em] text-harvest-deep">
                    {stage.months.replace(/ /g, "")}
                  </span>
                </h3>
                <p className="text-[13px] leading-[1.55] text-soil">
                  {stage.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
