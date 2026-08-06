import { DocCard } from "@/components/ui/DocCard";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stamp } from "@/components/ui/Stamp";

const STEPS = [
  {
    no: "01",
    title: "Buy from farmers & agents",
    body: "Direct at the farm gate, and through our field agents across the districts.",
  },
  {
    no: "02",
    title: "Weigh & pay on the spot",
    body: "Certified scales, cash or mobile money the same day. The farmer keeps the ticket copy.",
  },
  {
    no: "03",
    title: "Aggregate in Tamale",
    body: "Cleaned, bagged and stacked in our warehouses until your order is full.",
  },
  {
    no: "04",
    title: "Deliver by truck",
    body: "Full truckloads to Accra and Kumasi - waybill and weighbridge ticket travel with the load.",
  },
];

/** How we work - 1/3 title, 2/3 waybill document stamped "EVERY LOAD". */
export function WaybillSteps() {
  return (
    <section className="mx-auto grid max-w-[1312px] grid-cols-1 items-start gap-10 px-5 pb-16 pt-16 lg:grid-cols-[380px_1fr] lg:gap-[72px] lg:px-8 lg:pb-24 lg:pt-[88px]">
      <Reveal>
        <SectionHeading
          className="lg:pt-4"
          eyebrow="HOW WE WORK"
          title="Nothing moves without a ticket."
          lede="The same four entries on every load's paperwork, every season. Ask to see the waybill - buyers always can."
        />
      </Reveal>
      <Reveal delay={120}>
      <DocCard
        title="WAYBILL - STANDARD PROCESS"
        fileNo="N° WB-0001"
        // Extra mobile bottom padding so the overhanging stamp never touches
        // the last step's text; header stacks on phones (too long for one row).
        className="mb-6 max-sm:pb-3 lg:mb-0"
        headerClassName="max-sm:flex-col max-sm:items-start max-sm:gap-1"
      >
        {STEPS.map((step, i) => (
          <div
            key={step.no}
            className={
              i < STEPS.length - 1
                ? "border-b border-soil/28 px-6 py-5 sm:px-7 lg:flex lg:items-baseline lg:gap-6"
                : "px-6 py-5 sm:px-7 lg:flex lg:items-baseline lg:gap-6"
            }
          >
            <span className="stencil text-[16px] text-harvest-deep lg:flex-none lg:basis-[34px] lg:text-[20px]">
              {step.no}
            </span>
            <h3 className="mt-1 font-display text-[17px] font-semibold text-forest lg:mt-0 lg:flex-none lg:basis-[240px] lg:text-[19px]">
              {step.title}
            </h3>
            <p className="mt-1.5 text-[14px] leading-[1.6] text-soil lg:mt-0">
              {step.body}
            </p>
          </div>
        ))}
        <Stamp className="absolute -bottom-6 right-4 rotate-[-7deg] lg:-bottom-6 lg:-right-7">
          Every load
        </Stamp>
      </DocCard>
      </Reveal>
    </section>
  );
}
