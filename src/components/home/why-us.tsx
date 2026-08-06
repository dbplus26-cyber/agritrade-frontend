import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const REASONS = [
  {
    no: "01",
    title: "VOLUME CAPACITY",
    body: "Warehouse aggregation means we fill full truckloads, not partial orders.",
  },
  {
    no: "02",
    title: "HONEST WEIGHING",
    body: "Every bag over a certified scale - you get the ticket with the delivery.",
  },
  {
    no: "03",
    title: "RELIABLE LOGISTICS",
    body: "Established trucking south. When we confirm a truck, it loads.",
  },
  {
    no: "04",
    title: "FLEXIBLE TERMS",
    body: "Payment arrangements that work for repeat business buyers.",
  },
];

/** Why buy from us - the dense editorial ledger on the forest band. */
export function WhyUs() {
  return (
    <section className="texture-grain-dark bg-forest px-5 py-14 lg:px-0 lg:py-[88px]">
      <Reveal className="mx-auto max-w-[1312px]">
      <div className="grid gap-9 lg:grid-cols-[360px_1fr] lg:gap-20 lg:px-8">
        <SectionHeading
          tone="dark"
          eyebrow="WHY BUY FROM US"
          title="Built on volume, weight and word."
        />
        <div className="flex flex-col">
          {REASONS.map((reason, i) => (
            <div
              key={reason.no}
              className={`grid grid-cols-[32px_1fr] items-baseline gap-x-4 gap-y-1 border-t border-surface/32 py-4 sm:grid-cols-[44px_220px_1fr] sm:gap-x-7 lg:py-[22px] ${i === REASONS.length - 1 ? "pb-0" : ""}`}
            >
              <span className="stencil text-[13px] tracking-[0.1em] text-harvest lg:text-[14px]">
                {reason.no}
              </span>
              <span className="font-display text-[14px] font-bold tracking-[0.04em] text-surface lg:text-[16px]">
                {reason.title}
              </span>
              <p className="col-start-2 text-[13.5px] leading-[1.65] text-surface/70 sm:col-start-auto lg:text-[14px]">
                {reason.body}
              </p>
            </div>
          ))}
        </div>
      </div>
      </Reveal>
    </section>
  );
}
