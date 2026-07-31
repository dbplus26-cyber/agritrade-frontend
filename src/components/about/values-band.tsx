import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const VALUES = [
  {
    no: "01",
    title: "FAIR PRICES TO FARMERS",
    body: "The day's price, quoted openly at the farm gate. A farmer who feels cheated once never sells to you again - our supply depends on being straight.",
  },
  {
    no: "02",
    title: "HONEST WEIGHING",
    body: "Certified scales, checked regularly, the ticket handed over on the spot. The weight we pay for is the weight we sell.",
  },
  {
    no: "03",
    title: "RELIABLE DELIVERY",
    body: "When we confirm a truck, it loads. Buyers in the south plan production around our deliveries, and we treat that as an obligation.",
  },
];

/** The account-book values band on forest. */
export function ValuesBand() {
  return (
    <section className="texture-grain-dark mt-10 bg-forest px-5 py-14 lg:mt-14 lg:px-0 lg:pb-[88px] lg:pt-[120px]">
      <Reveal className="mx-auto max-w-[1312px]">
      <div className="grid gap-8 lg:grid-cols-[340px_1fr] lg:gap-20 lg:px-8">
        <SectionHeading
          tone="dark"
          eyebrow="WHAT WE STAND ON"
          title="Three things we don't bend."
        />
        <div className="flex flex-col">
          {VALUES.map((value, i) => (
            <div
              key={value.no}
              className={`grid grid-cols-[28px_1fr] items-baseline gap-x-3.5 gap-y-1 border-t border-surface/32 py-4 sm:grid-cols-[44px_230px_1fr] sm:gap-x-7 lg:py-[22px] ${i === VALUES.length - 1 ? "lg:pb-0" : ""}`}
            >
              <span className="stencil text-[13px] tracking-[0.1em] text-harvest lg:text-[14px]">
                {value.no}
              </span>
              <span className="font-display text-[14px] font-bold tracking-[0.04em] text-surface lg:text-[16px]">
                {value.title}
              </span>
              <p className="col-start-2 text-[13px] leading-[1.65] text-surface/75 sm:col-start-auto lg:text-[14px]">
                {value.body}
              </p>
            </div>
          ))}
        </div>
      </div>
      </Reveal>
    </section>
  );
}
