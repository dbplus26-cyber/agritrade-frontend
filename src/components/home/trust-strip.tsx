import { Reveal } from "@/components/ui/Reveal";

const FACTS = [
  {
    value: "08",
    label: "SOURCING DISTRICTS",
    note: "Bought at the farm gate across the Northern Region.",
  },
  {
    value: "100%",
    label: "CERTIFIED WEIGHING",
    note: "Every bag over the scale - the ticket travels with the load.",
  },
  {
    value: "03",
    label: "LINES OF BUSINESS",
    note: "Commodities, documented land, the farming scheme.",
  },
  {
    value: "ACC · TMA · KSI",
    label: "DELIVERY ROUTES",
    note: "Full truckloads south to Accra, Tema and Kumasi.",
  },
];

/**
 * The credibility ledger — four stencil-numeral tiles between the board and
 * the waybill. Traders buy on trust signals; this is where they land first.
 */
export function TrustStrip() {
  return (
    <section
      aria-label="Why buyers trust DB Plus"
      className="mx-auto max-w-[1312px] px-5 pt-14 lg:px-8 lg:pt-20"
    >
      <Reveal>
        <div className="grid grid-cols-1 border-y-[1.5px] border-soil/50 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((fact, i) => (
            <div
              key={fact.label}
              className={`px-1 py-5 sm:px-6 lg:py-7 ${
                i > 0
                  ? "border-t border-dotted border-soil/40 sm:border-t-0 sm:border-l"
                  : ""
              } ${i === 2 ? "max-lg:sm:border-t max-lg:sm:border-l-0" : ""} ${i === 3 ? "max-lg:sm:border-t" : ""}`}
            >
              <div className="mb-1.5 whitespace-nowrap font-display text-[26px] font-bold leading-none tracking-[0.01em] text-forest lg:text-[32px]">
                {fact.value}
              </div>
              <div className="stencil mb-2 text-[10px] tracking-[0.22em] text-harvest-deep lg:text-[11px]">
                {fact.label}
              </div>
              <p className="max-w-[30ch] text-[12.5px] leading-[1.6] text-soil lg:text-[13px]">
                {fact.note}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
